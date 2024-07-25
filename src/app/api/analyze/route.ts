import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';

// Define the ButterCMS data structure (you may need to adjust this based on your actual data structure)
interface ButterCMSData {
  data: {
    fields: {
      seo: {
        title: string;
        description: string;
      };
      body: Array<{
        type: string;
        fields: {
          paragraph?: string;
          image?: string;
          [key: string]: any;
        };
      }>;
    };
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getButterContent(url: string): Promise<ButterCMSData> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching from ButterCMS:', error);
    throw error;
  }
}
function extractHeadlines(data: ButterCMSData): string[] {
  return data.data.fields.body
    .filter(item => item.fields && item.fields.headline)
    .map(item => item.fields.headline as string);
}

function analyzeContent(content: ButterCMSData) {
  const wordCount = countWords(content);
  const headingsCount = countHeadings(content);
  const paragraphsCount = countParagraphs(content);
  const imagesCount = countImages(content);
  const terms = extractTerms(content);
  const headlines = extractHeadlines(content);
  return {
    wordCount,
    headingsCount,
    paragraphsCount,
    imagesCount,
    terms,
    headlines,
    seoTitle: content.data.fields.seo.title,
    seoDescription: content.data.fields.seo.description,
  };
}

function countWords(data: ButterCMSData): number {
  let text = JSON.stringify(data);
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function countHeadings(data: ButterCMSData): number {
  return data.data.fields.body.filter(item => item.type === 'hero' || item.type.includes('headline')).length;
}

function countParagraphs(data: ButterCMSData): number {
  return data.data.fields.body.filter(item => item.fields.paragraph).length;
}

function countImages(data: ButterCMSData): number {
  return data.data.fields.body.filter(item => item.fields.image).length;
}

function extractTerms(data: ButterCMSData) {
  let text = JSON.stringify(data);
  let words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
  let wordCount: {[key: string]: number} = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));
}

async function getChatGptSuggestions(content: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that provides SEO suggestions."},
        {"role": "user", "content": `Analyze this content and provide 5 SEO suggestions: ${content}`}
      ],
    });
    return completion.choices[0].message.content.split('\n');
  } catch (error) {
    console.error('Error getting ChatGPT suggestions:', error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const content = await getButterContent(url);
    const analysis = analyzeContent(content);
    const chatGptSuggestions = await getChatGptSuggestions(JSON.stringify(content));
    return NextResponse.json({ ...analysis, chatGptSuggestions });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json({ error: 'Error fetching or analyzing content', details: error.message }, { status: 500 });
  }
}