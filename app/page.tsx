// This is the final, fully corrected content for app/page.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Download, Play, BarChart3, AlertCircle, CheckCircle, Globe, Building, Eye, Search, Link } from 'lucide-react';

// Define types for our data structures to make the code safer
type FetchResult = {
  content: string;
  status: string;
  error: boolean;
  url: string;
};

type AnalysisResult = {
  country: string;
  outlet: string;
  robotsExists: boolean;
  blocksAI: boolean;
  aiBotsBlockedCount: number;
  blockingStrategy: string;
  blockedBotsList: string[];
  hasSitemaps: boolean;
  sitemapCount: number;
  blocksDiscussions: boolean;
  blocksArchives: boolean;
  blocksPremium: boolean;
  hasCrawlDelay: boolean;
  totalBlockedAgents: number;
  hasWildcards: boolean;
  debug: any;
  fetchUrl?: string;
};

const RobotsTxtAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [countryStats, setCountryStats] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<AnalysisResult[]>([]);
  const [corsWarning, setCorsWarning] = useState(false);

  const AI_BOTS = {
    'GPTBot': 'OpenAI', 'ClaudeBot': 'Anthropic', 'Claude-Web': 'Anthropic', 'Claude-User': 'Anthropic', 'Claude-SearchBot': 'Anthropic', 'anthropic-ai': 'Anthropic', 'Google-Extended': 'Google', 'Bytespider': 'ByteDance', 'TikTokSpider': 'ByteDance', 'CCBot': 'Common Crawl', 'PerplexityBot': 'Perplexity', 'Perplexity-User': 'Perplexity', 'FacebookBot': 'Meta', 'Diffbot': 'Diffbot', 'DiffBot': 'Diffbot', 'cohere-ai': 'Cohere', 'cohere-training-data-crawler': 'Cohere', 'YouBot': 'You.com', 'Applebot': 'Apple', 'Applebot-Extended': 'Apple', 'Amazonbot': 'Amazon', 'Omgilibot': 'Omgili', 'omgili': 'Omgili', 'ImagesiftBot': 'ImagesiftBot', 'AI2Bot': 'Allen Institute', 'Ai2Bot-Dolma': 'Allen Institute', 'ChatGPT-User': 'OpenAI', 'OAI-SearchBot': 'OpenAI', 'MachineLearning': 'Generic ML', 'PanguBot': 'PanguBot', 'QuillBot': 'QuillBot', 'TurnitinBot': 'Turnitin', 'img2dataset': 'Academic', 'news-please': 'Academic', 'magpie-crawler': 'Academic', 'DuckAssistBot': 'DuckDuckGo', 'Meta-ExternalAgent': 'Meta', 'Meta-ExternalFetcher': 'Meta', 'meta-externalagent': 'Meta', 'PetalBot': 'Petalsearch', 'MistralAI-User': 'Mistral', 'AhrefsBot': 'Ahrefs', 'Webzio-Extended': 'Webzio', 'Scrapy': 'Web Scraper'
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/);
      const headers = parseCSVLine(lines[0]);
      const parsedData = lines.slice(1).map(line => {
        if (!line.trim()) return null;
        try {
          const values = parseCSVLine(line);
          const row: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        } catch (error) {
          console.warn(`Error parsing line:`, error);
          return null;
        }
      }).filter(Boolean);
      setSites(parsedData as any[]);
    };
    
    reader.readAsText(uploadedFile);
  }, []);

  const fetchRobotsTxt = async (url: string): Promise<FetchResult> => {
    if (!url || url.trim() === '') return { content: '', status: 'No URL provided', error: true, url: '' };
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    
    try {
      const urlObject = new URL(cleanUrl);
      const robotsUrl = `${urlObject.protocol}//${urlObject.hostname}/robots.txt`;
      const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(robotsUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const content = await response.text();
        return { content, status: 'Success', error: false, url: robotsUrl };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown proxy error' }));
        return { content: '', status: `HTTP ${response.status} - ${errorData.error || response.statusText}`, error: true, url: robotsUrl };
      }
    } catch (error) {
      return { content: '', status: 'Invalid or unreachable URL', error: true, url: cleanUrl };
    }
  };

  const parseRobotsTxt = (content: string, country: string, outlet: string, fetchResult: FetchResult): AnalysisResult => {
    // --- THIS IS THE FIX ---
    // We explicitly tell TypeScript what type of items are in the arrays.
    const debug = {
      originalContent: content ? content.substring(0, 500) + '...' : 'No content',
      contentLength: content ? content.length : 0,
      fetchStatus: fetchResult.status,
      fetchUrl: fetchResult.url,
      fetchError: fetchResult.error,
      hasUserAgent: false, hasDisallow: false,
      userAgents: [] as string[],
      disallowRules: [] as string[],
      blockedBots: [] as string[],
      parsingErrors: [] as string[]
    };

    if (!content || content.trim() === '' || fetchResult.error) {
      debug.parsingErrors.push(fetchResult.status || 'No content available');
      return { country, outlet, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [], hasSitemaps: false, sitemapCount: 0, blocksDiscussions: false, blocksArchives: false, blocksPremium: false, hasCrawlDelay: false, totalBlockedAgents: 0, hasWildcards: false, debug };
    }

    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blockedBots = new Set<string>();
    const allBlockedAgents = new Set<string>();
    let currentAgent: string | null = null;
    let hasSitemaps = false;
    let sitemapCount = 0;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const lowerLine = trimmedLine.toLowerCase();

      if (lowerLine.startsWith('user-agent:')) {
        currentAgent = trimmedLine.substring(11).trim();
        debug.hasUserAgent = true;
      } else if (lowerLine.startsWith('disallow:') && currentAgent) {
        debug.hasDisallow = true;
        const path = trimmedLine.substring(9).trim();
        if (path === '/') {
          allBlockedAgents.add(currentAgent.toLowerCase());
          Object.keys(AI_BOTS).forEach(bot => {
            if (currentAgent === '*' || currentAgent!.toLowerCase() === bot.toLowerCase()) {
              blockedBots.add(bot);
            }
          });
        }
      } else if (lowerLine.startsWith('sitemap:')) {
        hasSitemaps = true;
        sitemapCount++;
      }
    });

    const aiBotsBlockedCount = blockedBots.size;
    let blockingStrategy = 'None';
    if (aiBotsBlockedCount > 20) blockingStrategy = 'Extensive';
    else if (aiBotsBlockedCount > 10) blockingStrategy = 'Comprehensive';
    else if (aiBotsBlockedCount > 3) blockingStrategy = 'Moderate';
    else if (aiBotsBlockedCount > 0) blockingStrategy = 'Basic';

    return { country, outlet, robotsExists: true, blocksAI: aiBotsBlockedCount > 0, aiBotsBlockedCount, blockingStrategy, blockedBotsList: Array.from(blockedBots).sort(), hasSitemaps, sitemapCount, blocksDiscussions: false, blocksArchives: false, blocksPremium: false, hasCrawlDelay: false, totalBlockedAgents: allBlockedAgents.size, hasWildcards: false, debug };
  };

  const analyzeAllSites = async () => {
    if (!sites.length) return;
    setAnalyzing(true);
    setProgress(0);
    const newResults: AnalysisResult[] = [];
    
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      const fetchResult = await fetchRobotsTxt(site['Robots.txt'] || '');
      const analysis = parseRobotsTxt(fetchResult.content, site['Country'] || '', site['Outlet'] || '', fetchResult);
      analysis.fetchUrl = fetchResult.url;
      newResults.push(analysis);
      setProgress(((i + 1) / sites.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setResults(newResults);
    setAnalyzing(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          BotScanner: AI Bot Blocking Analysis
        </h1>
        <p className="text-gray-600">
          Upload a CSV of news outlets to analyze their `robots.txt` files for AI blocking rules.
        </p>
      </div>

      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <div className="mb-4">
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Upload CSV File
              </span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {file && <p className="text-green-600 font-medium">✓ Loaded: {file.name} ({sites.length} outlets)</p>}
          <p className="text-sm text-gray-500 mt-2">Expected format: Country, Outlet, Robots.txt (URL) columns</p>
        </div>
      </div>

      {sites.length > 0 && (
        <div className="mb-8 flex gap-4 flex-wrap">
          <button onClick={analyzeAllSites} disabled={analyzing} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
            <Play size={20} />
            {analyzing ? `Analyzing... ${Math.round(progress)}%` : 'Fetch & Analyze All Sites'}
          </button>
        </div>
      )}

      {analyzing && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Outlet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Robots.txt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocks AI</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Strategy</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Bot Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.outlet} ({result.country})</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${result.robotsExists ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {result.robotsExists ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${result.blocksAI ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.blocksAI ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{result.blockingStrategy}</td>
                    <td className="px-4 py-3 text-sm text-center">{result.aiBotsBlockedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  return <RobotsTxtAnalyzer />;
}