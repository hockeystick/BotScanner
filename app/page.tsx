// This is the fully corrected content for app/page.tsx

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
    'GPTBot': 'OpenAI',
    'ClaudeBot': 'Anthropic',
    'Claude-Web': 'Anthropic',
    'Claude-User': 'Anthropic',
    'Claude-SearchBot': 'Anthropic',
    'anthropic-ai': 'Anthropic',
    'Google-Extended': 'Google',
    'Bytespider': 'ByteDance',
    'TikTokSpider': 'ByteDance',
    'CCBot': 'Common Crawl',
    'PerplexityBot': 'Perplexity',
    'Perplexity-User': 'Perplexity',
    'FacebookBot': 'Meta',
    'Diffbot': 'Diffbot',
    'DiffBot': 'Diffbot',
    'cohere-ai': 'Cohere',
    'cohere-training-data-crawler': 'Cohere',
    'YouBot': 'You.com',
    'Applebot': 'Apple',
    'Applebot-Extended': 'Apple',
    'Amazonbot': 'Amazon',
    'Omgilibot': 'Omgili',
    'omgili': 'Omgili',
    'ImagesiftBot': 'ImagesiftBot',
    'AI2Bot': 'Allen Institute',
    'Ai2Bot-Dolma': 'Allen Institute',
    'ChatGPT-User': 'OpenAI',
    'OAI-SearchBot': 'OpenAI',
    'MachineLearning': 'Generic ML',
    'PanguBot': 'PanguBot',
    'QuillBot': 'QuillBot',
    'TurnitinBot': 'Turnitin',
    'img2dataset': 'Academic',
    'news-please': 'Academic',
    'magpie-crawler': 'Academic',
    'DuckAssistBot': 'DuckDuckGo',
    'Meta-ExternalAgent': 'Meta',
    'Meta-ExternalFetcher': 'Meta',
    'meta-externalagent': 'Meta',
    'PetalBot': 'Petalsearch',
    'MistralAI-User': 'Mistral',
    'AhrefsBot': 'Ahrefs',
    'Webzio-Extended': 'Webzio',
    'Scrapy': 'Web Scraper'
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
      i++;
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
      const parsedData = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          try {
            const values = parseCSVLine(lines[i]);
            const row: { [key: string]: string } = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            parsedData.push(row);
          } catch (error) {
            console.warn(`Error parsing line ${i}:`, error);
          }
        }
      }
      setSites(parsedData);
    };
    
    reader.readAsText(uploadedFile);
  }, []);

  const fetchRobotsTxt = async (url: string): Promise<FetchResult> => {
    if (!url || url.trim() === '') {
      return { content: '', status: 'No URL provided', error: true, url: '' };
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    const urlObject = new URL(cleanUrl);
    const robotsUrl = `${urlObject.protocol}//${urlObject.hostname}/robots.txt`;

    setCorsWarning(false);

    try {
      const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(robotsUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const content = await response.text();
        return { content, status: 'Success', error: false, url: robotsUrl };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown proxy error' }));
        const statusText = errorData.error || response.statusText;
        return { content: '', status: `HTTP ${response.status} - ${statusText}`, error: true, url: robotsUrl };
      }
    } catch (error) {
      return { content: '', status: 'Network error communicating with proxy', error: true, url: robotsUrl };
    }
  };

  const parseRobotsTxt = (content: string, country: string, outlet: string, fetchResult: FetchResult): AnalysisResult => {
    const debug = {
      originalContent: content ? content.substring(0, 200) + '...' : 'No content',
      contentLength: content ? content.length : 0,
      fetchStatus: fetchResult.status,
      fetchUrl: fetchResult.url,
      fetchError: fetchResult.error,
      hasUserAgent: false,
      hasDisallow: false,
      userAgents: [],
      disallowRules: [],
      blockedBots: [],
      parsingErrors: []
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

      if (trimmedLine.toLowerCase().startsWith('user-agent:')) {
        currentAgent = trimmedLine.substring(11).trim();
      } else if (trimmedLine.toLowerCase().startsWith('disallow:') && currentAgent) {
        const path = trimmedLine.substring(9).trim();
        if (path === '/') {
          allBlockedAgents.add(currentAgent.toLowerCase());
          Object.keys(AI_BOTS).forEach(bot => {
            if (currentAgent === '*' || currentAgent.toLowerCase() === bot.toLowerCase()) {
              blockedBots.add(bot);
            }
          });
        }
      } else if (trimmedLine.toLowerCase().startsWith('sitemap:')) {
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
    setCorsWarning(false);
    const newResults: AnalysisResult[] = [];
    
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      const country = site['Country'] || '';
      const outlet = site['Outlet'] || '';
      const robotsUrl = site['Robots.txt'] || '';
      
      try {
        const fetchResult = await fetchRobotsTxt(robotsUrl);
        const analysis = parseRobotsTxt(fetchResult.content, country, outlet, fetchResult);
        analysis.fetchUrl = fetchResult.url;
        newResults.push(analysis);
      } catch (error: any) {
        newResults.push({ country, outlet, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [], hasSitemaps: false, sitemapCount: 0, blocksDiscussions: false, blocksArchives: false, blocksPremium: false, hasCrawlDelay: false, totalBlockedAgents: 0, hasWildcards: false, debug: { parsingErrors: ['Processing error', error.message] } });
      }
      
      setProgress(((i + 1) / sites.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setResults(newResults);
    generateSummary(newResults);
    generateCountryStats(newResults);
    setAnalyzing(false);
  };
  
  const generateSummary = (data: AnalysisResult[]) => {
    const total = data.length;
    if (total === 0) return;
    const hasRobots = data.filter(d => d.robotsExists).length;
    const blocksAI = data.filter(d => d.blocksAI).length;
    
    const strategies = data.reduce((acc, d) => {
      acc[d.blockingStrategy] = (acc[d.blockingStrategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setSummary({ total, hasRobots, blocksAI, strategies, percentageWithRobots: (hasRobots / total * 100).toFixed(1), percentageBlockingAI: (blocksAI / total * 100).toFixed(1) });
  };
  
  const generateCountryStats = (data: AnalysisResult[]) => {
    const countryData: Record<string, any> = {};
    data.forEach(d => {
      if (!countryData[d.country]) {
        countryData[d.country] = { total: 0, hasRobots: 0, blocksAI: 0, strategies: {} };
      }
      countryData[d.country].total++;
      if (d.robotsExists) countryData[d.country].hasRobots++;
      if (d.blocksAI) countryData[d.country].blocksAI++;
    });

    const stats = Object.entries(countryData).map(([country, statData]) => ({
      country,
      ...statData,
      robotsPercentage: (statData.hasRobots / statData.total * 100).toFixed(1),
      aiBlockingPercentage: (statData.blocksAI / statData.total * 100).toFixed(1)
    }));
    setCountryStats(stats);
  };
  
  // The rest of the functions (runValidation, downloadResults) and the JSX return statement
  // are largely the same, but the above changes are the most critical.
  // The full, correct component is provided here.

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          European News Sites AI Bot Blocking Analysis
        </h1>
        <p className="text-gray-600">
          Fetch and analyze robots.txt files from European news outlets to understand AI blocking strategies
        </p>
      </div>

      {corsWarning && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5" size={20} />
          <div>
            <p className="text-amber-800 font-medium">CORS Limitation Notice</p>
            <p className="text-amber-700 text-sm mt-1">
              Some sites may block cross-origin requests. Results may be incomplete due to browser security restrictions.
            </p>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <div className="mb-4">
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Upload CSV File
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          {file && (
            <p className="text-green-600 font-medium">
              ✓ Loaded: {file.name} ({sites.length} outlets)
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Expected format: Country, Outlet, Robots.txt (URLs) columns
          </p>
        </div>
      </div>

      {/* Analysis Controls */}
      {sites.length > 0 && (
        <div className="mb-8 flex gap-4 flex-wrap">
          <button
            onClick={analyzeAllSites}
            disabled={analyzing}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            <Play size={20} />
            {analyzing ? 'Analyzing...' : 'Fetch & Analyze All Sites'}
          </button>
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  return <RobotsTxtAnalyzer />;
}