'use client';
import React, { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Guidelines');
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/analyze', { url });
      setAnalysis(response.data);
      setHeadlines(response.data.headlines || []);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.response?.data?.details || error.message || 'An unknown error occurred');
      setAnalysis(null);
      setHeadlines([]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
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
          <button type="submit" className="bg-blue-500 text-white p-2 rounded" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {analysis && (
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Analysis Results:</h2>
            <div className="mb-4">
              <h3 className="font-semibold">SEO Information:</h3>
              <p><strong>Title:</strong> {analysis.seoTitle}</p>
              <p><strong>Description:</strong> {analysis.seoDescription}</p>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold">Content Structure:</h3>
              <p><strong>Word Count:</strong> {analysis.wordCount}</p>
              <p><strong>Headings Count:</strong> {analysis.headingsCount}</p>
              <p><strong>Paragraphs Count:</strong> {analysis.paragraphsCount}</p>
              <p><strong>Images Count:</strong> {analysis.imagesCount}</p>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold">Top Terms:</h3>
              <ul>
                {analysis.terms.slice(0, showAllTerms ? undefined : 5).map((term: any, index: number) => (
                  <li key={index}>{term.term}: {term.count}</li>
                ))}
              </ul>
              {analysis.terms.length > 5 && (
                <button 
                  onClick={() => setShowAllTerms(!showAllTerms)} 
                  className="text-blue-500 mt-2"
                >
                  {showAllTerms ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
          </div>
        )}

        {headlines.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Headlines:</h2>
            {headlines.map((headline, index) => (
              <h2 key={index} className="text-lg font-semibold mb-1">{headline}</h2>
            ))}
          </div>
        )}
      </div>

      <div className="flex-none bg-white w-96 p-6 shadow-lg overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b pb-2">
          {['Guidelines', 'AI Suggestions', 'Brief'].map((tab) => (
            <div
              key={tab}
              className={`text-sm cursor-pointer ${activeTab === tab ? 'font-semibold text-purple-700 border-b-2 border-purple-700' : 'text-gray-500'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {activeTab === 'Guidelines' && (
          <>
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <svg className="w-32 h-32" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e6e6e6"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    strokeDasharray="75, 100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-700">{analysis ? analysis.contentScore : 0}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">Content Score</div>
              <div className="text-sm text-gray-500">Avg ↡ 78 Top ↟ 80</div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex justify-between items-center">
                <span>Content Structure</span>
                <button className="text-purple-600 text-xs">Adjust</button>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Words', value: analysis ? analysis.wordCount : 0 },
                  { label: 'Headings', value: analysis ? analysis.headingsCount : 0 },
                  { label: 'Paragraphs', value: analysis ? analysis.paragraphsCount : 0 },
                  { label: 'Images', value: analysis ? analysis.imagesCount : 0 },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="text-gray-800 font-medium">{item.value} ↑</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex justify-between items-center">
                <span>Top Terms</span>
                <button className="text-purple-600 text-xs">Adjust</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <div 
                  className="bg-purple-700 text-white py-1 px-2 rounded-full text-xs cursor-pointer"
                  onClick={() => setShowAllTerms(!showAllTerms)}
                >
                  Show All
                </div>
                {analysis && (showAllTerms ? analysis.terms.slice(0, 10) : analysis.terms.slice(0, 5)).map((term: any, index: number) => (
                  <div key={index} className="bg-gray-200 text-gray-600 py-1 px-2 rounded-full text-xs">
                    #{term.term} - {term.count}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <button className="bg-purple-700 text-white py-1 px-3 rounded text-xs">All {analysis ? analysis.terms.length : 0}</button>
                <button className="bg-gray-200 text-gray-600 py-1 px-3 rounded text-xs">Headings 5</button>
                <button className="bg-gray-200 text-gray-600 py-1 px-3 rounded text-xs">NLP 76</button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'AI Suggestions' && analysis && analysis.chatGptSuggestions && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">ChatGPT Suggestions:</h3>
            <ul className="space-y-3">
              {analysis.chatGptSuggestions.map((suggestion: string, index: number) => (
                <li key={index} className="mb-3">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
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