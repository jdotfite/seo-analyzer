'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tooltip } from 'react-tooltip';
import DOMPurify from 'dompurify';

export default function Home() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState(0);

  useEffect(() => {
    if (analysis) {
      const timer = setTimeout(() => {
        setScoreAnimation(analysis.contentScore.total);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [analysis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/analyze', { url });
      setAnalysis(response.data);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.response?.data?.details || error.message || 'An unknown error occurred');
      setAnalysis(null);
    }
    setLoading(false);
  };

  const renderContentScore = () => {
    if (!analysis) return null;
    const score = scoreAnimation;
    const circumference = 2 * Math.PI * 40;
    const dashArray = (score / 100) * circumference;

    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-2 flex items-center">
          Content Score
          <Tooltip id="content-score-info" />
          <span 
            className="ml-2 text-gray-500 cursor-help"
            data-tooltip-id="content-score-info"
            data-tooltip-content="Score based on content structure, readability, and SEO factors."
          >
            ⓘ
          </span>
        </h3>
        <div className="relative w-full h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e0e0" strokeWidth="4" />
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              fill="none" 
              stroke="#52c41a"
              strokeWidth="4" 
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
            />
            <text x="50" y="50" textAnchor="middle" dy="0.3em" fontSize="16" fill="#333">
              {Math.round(score)}/100
            </text>
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {Object.entries(analysis.contentScore.breakdown).map(([key, value]: [string, number]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key.replace('_', ' ')}:</span>
              <span>{value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChatGptAnalysis = () => {
    if (!analysis || !analysis.chatGptAnalysis) return null;
    
    const sections = analysis.chatGptAnalysis.split('\n\n').map(section => {
      const [title, ...content] = section.split('\n');
      return { title: title.replace(/^#+\s*/, '').replace(/:$/, ''), content: content.join('\n') };
    });

    return (
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="bg-gray-100 p-4 rounded">
            <h4 className="font-semibold mb-2">{section.title}</h4>
            <p className="text-sm whitespace-pre-wrap">{section.content}</p>
          </div>
        ))}
      </div>
    );
  };

  const getHeadlineScoreColor = (score: number) => {
    if (score >= 80) return 'border-green-500 text-green-500';
    if (score >= 60) return 'border-yellow-500 text-yellow-500';
    return 'border-red-500 text-red-500';
  };

  const renderContentOutline = () => {
    if (!analysis) return null;

    return (
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Content Outline:</h2>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{analysis.title}</h3>
            <span className={`ml-5 text-sm border rounded-full px-2 py-1 ${getHeadlineScoreColor(analysis.headlineScore)}`}>
              {analysis.headlineScore}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            By {analysis.author} | Published on {analysis.publishDate}
          </p>
          <p><strong>SEO Title:</strong> {analysis.seoTitle}</p>
          <p><strong>Meta Description:</strong> {analysis.seoDescription}</p>
        </div>
        {analysis.featuredImage && (
          <img 
            src={analysis.featuredImage} 
            alt="Featured Image" 
            className="float-right mb-2 ml-3 w-1/2 sm:w-full md:w-1/2"
          />
        )}
        <div 
          className="prose max-w-none" 
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(analysis.body.replace(/<p>/g, '<p class="mb-3">')) 
          }} 
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">ButterCMS SEO Analyzer</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-2">
            <label className="block">
              ButterCMS URL:
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter full ButterCMS API URL"
              />
            </label>
          </div>
          <button type="submit" className="bg-black text-white p-2 hover:bg-gray-800 transition duration-300" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {analysis && renderContentOutline()}
      </div>

      <div className="flex-none bg-white w-full md:w-96 p-6 shadow-lg overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b pb-2">
          {['Overview', 'AI Analysis', 'Recommendations'].map((tab) => (
            <div
              key={tab}
              className={`text-sm cursor-pointer ${activeTab === tab ? 'font-semibold text-purple-700 border-b-2 border-purple-700' : 'text-gray-500'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {activeTab === 'Overview' && analysis && (
          <div className="space-y-4">
            {renderContentScore()}
            <div>
              <h3 className="font-semibold mb-2">Content Structure:</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>Words: {analysis.wordCount}</div>
                <div>Headings: {analysis.headingsCount}</div>
                <div>Paragraphs: {analysis.paragraphsCount}</div>
                <div>Images: {analysis.imagesCount}</div>
                <div>Read Time: {analysis.readTime}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Top Terms:</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.terms.slice(0, showAllTerms ? undefined : 5).map((term: any, index: number) => (
                  <span key={index} className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
                    {term.term} ({term.count})
                  </span>
                ))}
              </div>
              {analysis.terms.length > 5 && (
                <button 
                  onClick={() => setShowAllTerms(!showAllTerms)} 
                  className="text-purple-600 text-sm mt-2"
                >
                  {showAllTerms ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Categories & Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.categories.map((category: any, index: number) => (
                  <span key={index} className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-sm">
                    {category.name}
                  </span>
                ))}
                {analysis.tags.map((tag: any, index: number) => (
                  <span key={index} className="bg-green-200 text-green-700 px-2 py-1 rounded-full text-sm">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AI Analysis' && analysis && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">AI Suggestions:</h3>
            {renderChatGptAnalysis()}
          </div>
        )}

        {activeTab === 'Recommendations' && analysis && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">SEO Recommendations:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Optimize your title tag (current length: {analysis.seoTitle.length} characters)</li>
              <li>Improve meta description (current length: {analysis.seoDescription.length} characters)</li>
              <li>Add more relevant internal links</li>
              <li>Optimize images with alt tags</li>
              <li>Improve content readability</li>
            </ul>
          </div>
        )}

        <div className="space-y-3 mt-6">
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded font-medium hover:bg-purple-700 transition duration-300">
            ✨ Auto-Optimize
          </button>
          <button className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded font-medium hover:bg-gray-300 transition duration-300">
            Insert internal links
          </button>
        </div>
      </div>
    </div>
  );
}