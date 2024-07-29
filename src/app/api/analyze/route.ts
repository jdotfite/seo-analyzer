import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import readingTime from 'reading-time';
import keywordExtractor from 'keyword-extractor';
import { convert } from 'html-to-text';
import { removeStopwords } from 'stopword';

interface BlogPostData {
  data: {
    title: string;
    body: string;
    seo_title: string;
    meta_description: string;
    tags: Array<{ name: string; slug: string }>;
    categories: Array<{ name: string; slug: string }>;
    author: {
      first_name: string;
      last_name: string;
    };
    published: string;
    featured_image: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getButterContent(url: string): Promise<BlogPostData> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching from ButterCMS:', error);
    throw error;
  }
}

function calculateContentScore(analysis: any): { total: number; breakdown: { [key: string]: number } } {
  let breakdown = {
    word_count: 0,
    headings: 0,
    images: 0,
    paragraphs: 0,
    read_time: 0,
    keyword_usage: 0,
    meta_description: 0,
    title_length: 0
  };

  // Word count (0-20 points)
  breakdown.word_count = Math.min(analysis.wordCount / 25, 20);

  // Headings (0-15 points)
  breakdown.headings = Math.min(analysis.headingsCount * 3, 15);

  // Images (0-10 points)
  breakdown.images = Math.min(analysis.imagesCount * 2, 10);

  // Paragraphs (0-10 points)
  breakdown.paragraphs = Math.min(analysis.paragraphsCount / 2, 10);

  // Read time (0-10 points)
  const readTimeMinutes = parseInt(analysis.readTime.split(' ')[0]);
  breakdown.read_time = Math.min(readTimeMinutes, 10);

  // Keyword usage (0-15 points)
  breakdown.keyword_usage = Math.min(analysis.terms.length, 15);

  // Meta description length (0-10 points)
  const descriptionLength = analysis.seoDescription.length;
  breakdown.meta_description = descriptionLength >= 120 && descriptionLength <= 155 ? 10 : 
                               descriptionLength > 0 ? 5 : 0;

  // Title length (0-10 points)
  const titleLength = analysis.seoTitle.length;
  breakdown.title_length = titleLength >= 50 && titleLength <= 60 ? 10 : 
                           titleLength > 0 ? 5 : 0;

  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return { total: Math.round(total), breakdown };
}

async function analyzeHeadline(headline: string): Promise<number> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          "role": "system",
          "content": "You are an SEO expert assistant. Analyze the given headline and count the number of words that fall into each of these categories: power words, action words, descriptive words, number words, question words, adjective words, and emotional words. Respond with only the counts in JSON format."
        },
        {
          "role": "user",
          "content": `Analyze this headline: "${headline}"`
        }
      ],
      temperature: 0.5,
      max_tokens: 150,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");

    let score = 0;
    const words = headline.split(/\s+/);

    // Calculate score based on word counts
    score += (analysis.powerWords || 0) * 10;
    score += (analysis.actionWords || 0) * 10;
    score += (analysis.descriptiveWords || 0) * 10;
    score += (analysis.numberWords || 0) * 10;
    score += (analysis.questionWords || 0) * 10;
    score += (analysis.adjectiveWords || 0) * 10;
    score += (analysis.emotionalWords || 0) * 10;

    // Check headline length
    if (words.length >= 5 && words.length <= 10) score += 30;
    else if (words.length > 10) score += 20;
    else score += 10;

    // Bonus for starting with a number or "How"
    if (/^\d/.test(headline) || headline.toLowerCase().startsWith('how')) score += 10;

    // Penalty for excessive length
    if (headline.length > 70) score -= 10;

    // Ensure score is within 0 to 100 range
    return Math.min(Math.max(score, 0), 100);
  } catch (error) {
    console.error('Error analyzing headline:', error);
    return 0; // Return a default score if analysis fails
  }
}

function extractTerms(text: string) {
  const keywords = keywordExtractor.extract(text, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: false
  });
  const filteredKeywords = removeStopwords(keywords);
  
  const wordCount: {[key: string]: number} = {};
  filteredKeywords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));
}

function analyzeKeywordDensity(text: string, keywords: string[]): { [key: string]: number } {
  const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
  const totalWords = words.length;
  const density: { [key: string]: number } = {};

  keywords.forEach(keyword => {
    const count = words.filter(word => word === keyword.toLowerCase()).length;
    density[keyword] = Number(((count / totalWords) * 100).toFixed(2));
  });

  return density;
}

async function analyzeContent(content: BlogPostData) {
  const textContent = extractTextContent(content.data.body);
  const wordCount = countWords(textContent);
  const headingsCount = countHeadings(content.data.body);
  const paragraphsCount = countParagraphs(content.data.body);
  const imagesCount = countImages(content.data.body);
  const terms = extractTerms(textContent);
  const readTimeResult = readingTime(textContent);
  const keywordDensity = analyzeKeywordDensity(textContent, terms.slice(0, 5).map(term => term.term));

  const analysis = {
    wordCount,
    headingsCount,
    paragraphsCount,
    imagesCount,
    terms,
    readTime: readTimeResult.text,
    seoTitle: content.data.seo_title,
    seoDescription: content.data.meta_description,
    keywordDensity,
    title: content.data.title,
    body: content.data.body,
    tags: content.data.tags,
    categories: content.data.categories,
    author: `${content.data.author.first_name} ${content.data.author.last_name}`,
    publishDate: new Date(content.data.published).toLocaleDateString(),
    featuredImage: content.data.featured_image,
  };

  const contentScore = calculateContentScore(analysis);
  const headlineScore = await analyzeHeadline(content.data.title);

  return {
    ...analysis,
    contentScore,
    headlineScore,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0 && !/^(https?:\/\/|www\.)/.test(word)).length;
}

function countHeadings(html: string): number {
  const headingMatches = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi);
  return headingMatches ? headingMatches.length : 0;
}

function countParagraphs(html: string): number {
  const paragraphMatches = html.match(/<p[^>]*>.*?<\/p>/gi);
  return paragraphMatches ? paragraphMatches.length : 0;
}

function countImages(html: string): number {
  const imageMatches = html.match(/<img[^>]*>/gi);
  return imageMatches ? imageMatches.length : 0;
}

function extractTextContent(html: string): string {
  return convert(html, {
    wordwrap: false,
    preserveNewlines: true,
    singleNewLineParagraphs: true,
  });
}

async function getChatGptAnalysis(content: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are an SEO expert assistant."},
        {"role": "user", "content": `Analyze this content and provide:
        1. 3 SEO improvement suggestions
        2. A rewritten meta description (max 155 characters)
        3. 2 alternative headlines
        4. An assessment of content relevance to the main topic
        5. Keyword density analysis for top 5 terms

        Format your response with clear headings for each section.

        Content: ${content}`}
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error getting ChatGPT analysis:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const content = await getButterContent(url);
    const analysis = await analyzeContent(content);
    const chatGptAnalysis = await getChatGptAnalysis(JSON.stringify(content.data));
    return NextResponse.json({ ...analysis, chatGptAnalysis });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json({ error: 'Error fetching or analyzing content', details: error.message }, { status: 500 });
  }
}