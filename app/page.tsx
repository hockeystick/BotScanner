// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client'; // <-- THIS IS THE CRUCIAL LINE THAT MAKES THE PAGE INTERACTIVE

import React, { useState, useCallback } from 'react';
import { Upload, Play, BarChart3, AlertCircle, CheckCircle, Globe, Link as LinkIcon } from 'lucide-react';

// Define types for our data structures
type SiteData = { [key: string]: string };

type FetchResult = {
  content: string;
  status: string;
  error: boolean;
  url: string;
  headers?: Record<string, string>;
};

type PageFetchResult = {
  content: string;
  headers: Record<string, string>;
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
  hasCrawlDelay: boolean;
  fetchUrl?: string;
  // New meta tag and header analysis
  hasNoAIMetaTag: boolean;
  hasNoImageAIMetaTag: boolean;
  hasXRobotsNoAI: boolean;
  hasXRobotsNoImageAI: boolean;
  metaTagsFound: string[];
  xRobotsTagsFound: string[];
  protectionScore: number;
  // URLs for transparency
  homepageUrl?: string;
  homepageChecked: boolean;
};

const BotScannerPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [summary, setSummary] = useState<any | null>(null);

  const AI_BOTS: { [key: string]: { owner: string; category: string } } = {
    // Major AI Labs
    'GPTBot': { owner: 'OpenAI', category: 'Major AI' }, 'ChatGPT-User': { owner: 'OpenAI', category: 'Major AI' }, 'OAI-SearchBot': { owner: 'OpenAI', category: 'Major AI' }, 'Google-Extended': { owner: 'Google', category: 'Major AI' }, 'anthropic-ai': { owner: 'Anthropic', category: 'Major AI' }, 'ClaudeBot': { owner: 'Anthropic', category: 'Major AI' }, 'Claude-Web': { owner: 'Anthropic', category: 'Major AI' }, 'Claude-User': { owner: 'Anthropic', category: 'Major AI'}, 'Claude-SearchBot': { owner: 'Anthropic', category: 'Major AI'}, 'cohere-ai': { owner: 'Cohere', category: 'Major AI' }, 'MistralAI-User': { owner: 'Mistral', category: 'Major AI' }, 'FacebookBot': { owner: 'Meta', category: 'Social Media' }, 'Meta-ExternalAgent': { owner: 'Meta', category: 'Social Media' }, 'meta-externalagent': { owner: 'Meta', category: 'Social Media' },
    // Search & Aggregators
    'PerplexityBot': { owner: 'Perplexity', category: 'Search' }, 'Perplexity-User': { owner: 'Perplexity', category: 'Search' }, 'YouBot': { owner: 'You.com', category: 'Search' }, 'DuckAssistBot': { owner: 'DuckDuckGo', category: 'Search' }, 'PetalBot': { owner: 'Petal Search', category: 'Search'},
    // Web Crawlers / SEO
    'Bytespider': { owner: 'ByteDance', category: 'Web Crawler' }, 'TikTokSpider': { owner: 'ByteDance', category: 'Web Crawler' }, 'CCBot': { owner: 'Common Crawl', category: 'Web Crawler' }, 'AhrefsBot': { owner: 'Ahrefs', category: 'SEO' }, 'Applebot': { owner: 'Apple', category: 'Web Crawler' }, 'Applebot-Extended': { owner: 'Apple', category: 'Web Crawler' }, 'Amazonbot': { owner: 'Amazon', category: 'Web Crawler' }, 'Diffbot': { owner: 'Diffbot', category: 'Web Crawler' },
    // Academic & Other
    'AI2Bot': { owner: 'Allen Institute', category: 'Academic' }, 'Ai2Bot-Dolma': { owner: 'Allen Institute', category: 'Academic' }, 'img2dataset': { owner: 'Academic', category: 'Academic' }, 'news-please': { owner: 'Academic', category: 'Academic' }, 'magpie-crawler': { owner: 'Academic', category: 'Academic' },
    // Unknown or Generic
    'Omgilibot': { owner: 'Omgili', category: 'Generic' }, 'omgili': { owner: 'Omgili', category: 'Generic' },
  };
  
  const strategyColors: { [key: string]: string } = {
    Extensive: 'bg-red-100 text-red-800',
    Comprehensive: 'bg-orange-100 text-orange-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    Basic: 'bg-blue-100 text-blue-800',
    None: 'bg-gray-100 text-gray-800',
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
          i++; // Skip the next quote
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
      if (lines.length < 2) return;
      
      const headers = parseCSVLine(lines[0]);
      const parsedData = lines.slice(1).map(line => {
        if (!line.trim()) return null;
        try {
          const values = parseCSVLine(line);
          const row: SiteData = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        } catch (error) {
          console.warn(`Error parsing line:`, error);
          return null;
        }
      }).filter(Boolean); // remove any nulls from failed parses
      setSites(parsedData as SiteData[]);
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

  const fetchPageContent = async (url: string): Promise<PageFetchResult | null> => {
    if (!url || url.trim() === '') return null;
    
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    
    try {
      const urlObject = new URL(cleanUrl);
      const pageUrl = `${urlObject.protocol}//${urlObject.hostname}/`;
      const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(pageUrl)}&type=page`;
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const data = await response.json();
        return {
          content: data.content,
          headers: data.headers,
          url: pageUrl
        };
      }
    } catch (error) {
      console.warn('Failed to fetch page content:', error);
    }
    return null;
  };

  const parseMetaTags = (htmlContent: string): { hasNoAI: boolean; hasNoImageAI: boolean; foundTags: string[] } => {
    const foundTags: string[] = [];
    let hasNoAI = false;
    let hasNoImageAI = false;

    // Look for robots meta tags
    const metaRegex = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = metaRegex.exec(htmlContent)) !== null) {
      const content = match[1].toLowerCase();
      foundTags.push(match[1]);
      
      if (content.includes('noai')) {
        hasNoAI = true;
      }
      if (content.includes('noimageai')) {
        hasNoImageAI = true;
      }
    }

    return { hasNoAI, hasNoImageAI, foundTags };
  };

  const parseXRobotsTags = (headers: Record<string, string>): { hasNoAI: boolean; hasNoImageAI: boolean; foundTags: string[] } => {
    const foundTags: string[] = [];
    let hasNoAI = false;
    let hasNoImageAI = false;

    // Check for X-Robots-Tag headers
    const xRobotsTag = headers['x-robots-tag'];
    if (xRobotsTag) {
      foundTags.push(xRobotsTag);
      const tagLower = xRobotsTag.toLowerCase();
      
      if (tagLower.includes('noai')) {
        hasNoAI = true;
      }
      if (tagLower.includes('noimageai')) {
        hasNoImageAI = true;
      }
    }

    return { hasNoAI, hasNoImageAI, foundTags };
  };

  const calculateProtectionScore = (analysis: Omit<AnalysisResult, 'protectionScore'>): number => {
    let score = 0;
    
    // Basic robots.txt blocking (1-3 points each)
    score += analysis.aiBotsBlockedCount;
    
    // Meta tags (4 points each)
    if (analysis.hasNoAIMetaTag) score += 4;
    if (analysis.hasNoImageAIMetaTag) score += 4;
    
    // HTTP headers (5 points each)
    if (analysis.hasXRobotsNoAI) score += 5;
    if (analysis.hasXRobotsNoImageAI) score += 5;
    
    // Bonus for comprehensive approach
    if (analysis.robotsExists && analysis.blocksAI && (analysis.hasNoAIMetaTag || analysis.hasXRobotsNoAI)) {
      score += 3; // Multi-layer protection bonus
    }

    return score;
  };

  const parseRobotsTxt = (content: string, country: string, outlet: string): AnalysisResult => {
    if (!content || content.trim() === '') {
      return { 
        country, 
        outlet, 
        robotsExists: false, 
        blocksAI: false, 
        aiBotsBlockedCount: 0, 
        blockingStrategy: 'None', 
        blockedBotsList: [], 
        hasSitemaps: false, 
        hasCrawlDelay: false,
        hasNoAIMetaTag: false,
        hasNoImageAIMetaTag: false,
        hasXRobotsNoAI: false,
        hasXRobotsNoImageAI: false,
        metaTagsFound: [],
        xRobotsTagsFound: [],
        protectionScore: 0,
        homepageChecked: false
      };
    }

    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blockedBots = new Set<string>();
    let currentAgent: string | null = null;
    let hasSitemaps = false;
    let hasCrawlDelay = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const lowerLine = trimmedLine.toLowerCase();

      if (lowerLine.startsWith('user-agent:')) {
        currentAgent = trimmedLine.substring(11).trim();
      } else if (lowerLine.startsWith('disallow:') && currentAgent) {
        const path = trimmedLine.substring(9).trim();
        // Check for blocking all AI bots or specific ones
        if (path === '/') {
            Object.keys(AI_BOTS).forEach(bot => {
                if (currentAgent === '*' || currentAgent!.toLowerCase() === bot.toLowerCase()) {
                  blockedBots.add(bot);
                }
            });
        }
      } else if (lowerLine.startsWith('sitemap:')) {
        hasSitemaps = true;
      } else if (lowerLine.startsWith('crawl-delay:')) {
        hasCrawlDelay = true;
      }
    });

    const aiBotsBlockedCount = blockedBots.size;
    let blockingStrategy = 'None';
    if (aiBotsBlockedCount > 20) blockingStrategy = 'Extensive';
    else if (aiBotsBlockedCount > 10) blockingStrategy = 'Comprehensive';
    else if (aiBotsBlockedCount > 3) blockingStrategy = 'Moderate';
    else if (aiBotsBlockedCount > 0) blockingStrategy = 'Basic';

    const baseResult = { 
      country, 
      outlet, 
      robotsExists: true, 
      blocksAI: aiBotsBlockedCount > 0, 
      aiBotsBlockedCount, 
      blockingStrategy, 
      blockedBotsList: Array.from(blockedBots).sort(), 
      hasSitemaps, 
      hasCrawlDelay,
      hasNoAIMetaTag: false,
      hasNoImageAIMetaTag: false,
      hasXRobotsNoAI: false,
      hasXRobotsNoImageAI: false,
      metaTagsFound: [],
      xRobotsTagsFound: [],
      homepageChecked: false
    };

    const protectionScore = calculateProtectionScore(baseResult);

    return { ...baseResult, protectionScore };
  };

  const analyzeAllSites = async () => {
    if (!sites.length) return;
    setAnalyzing(true);
    setProgress(0);
    setResults([]);
    setSummary(null);

    const analysisResults: AnalysisResult[] = [];
    
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      
      // Extract domain from the input URL for consistency
      let domain = '';
      try {
        let cleanUrl = (site['Robots.txt'] || '').trim();
        if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
        const urlObject = new URL(cleanUrl);
        domain = `${urlObject.protocol}//${urlObject.hostname}`;
      } catch (error) {
        console.warn('Invalid URL for site:', site['Outlet'], error);
        continue;
      }
      
      // 1. Fetch robots.txt
      const robotsFetchResult = await fetchRobotsTxt(site['Robots.txt'] || '');
      let analysis = parseRobotsTxt(robotsFetchResult.content, site['Country'] || '', site['Outlet'] || '');
      analysis.fetchUrl = robotsFetchResult.url;
      
      // 2. Fetch homepage for meta tags and headers
      console.log(`Checking homepage for meta tags: ${domain}/`);
      const pageResult = await fetchPageContent(domain);
      if (pageResult) {
        analysis.homepageUrl = pageResult.url;
        analysis.homepageChecked = true;
        
        // Parse meta tags from homepage HTML
        const metaAnalysis = parseMetaTags(pageResult.content);
        analysis.hasNoAIMetaTag = metaAnalysis.hasNoAI;
        analysis.hasNoImageAIMetaTag = metaAnalysis.hasNoImageAI;
        analysis.metaTagsFound = metaAnalysis.foundTags;
        
        // Parse X-Robots-Tag headers from homepage response
        const headerAnalysis = parseXRobotsTags(pageResult.headers);
        analysis.hasXRobotsNoAI = headerAnalysis.hasNoAI;
        analysis.hasXRobotsNoImageAI = headerAnalysis.hasNoImageAI;
        analysis.xRobotsTagsFound = headerAnalysis.foundTags;
        
        // Recalculate protection score with new data
        analysis.protectionScore = calculateProtectionScore(analysis);
      } else {
        analysis.homepageChecked = false;
        console.warn(`Failed to fetch homepage for: ${domain}`);
      }
      
      analysisResults.push(analysis);
      setProgress(((i + 1) / sites.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for rate limiting
    }
    
    setResults(analysisResults);
    generateSummary(analysisResults);
    setAnalyzing(false);
  };

  const generateSummary = (data: AnalysisResult[]) => {
    const total = data.length;
    if (total === 0) return;

    const sitesWithRobots = data.filter(d => d.robotsExists).length;
    const sitesBlockingAI = data.filter(d => d.blocksAI);
    const sitesBlockingAICount = sitesBlockingAI.length;

    const sitesWithoutRobots = total - sitesWithRobots;
    const sitesWithCrawlDelay = data.filter(d => d.hasCrawlDelay).length;
    const sitesWithSitemaps = data.filter(d => d.hasSitemaps).length;

    // New meta tag and header analysis
    const homepagesChecked = data.filter(d => d.homepageChecked).length;
    const sitesWithNoAIMeta = data.filter(d => d.hasNoAIMetaTag).length;
    const sitesWithNoImageAIMeta = data.filter(d => d.hasNoImageAIMetaTag).length;
    const sitesWithXRobotsNoAI = data.filter(d => d.hasXRobotsNoAI).length;
    const sitesWithXRobotsNoImageAI = data.filter(d => d.hasXRobotsNoImageAI).length;

    // Calculate average protection score
    const averageProtectionScore = total > 0 ? (data.reduce((sum, site) => sum + site.protectionScore, 0) / total).toFixed(1) : 0;

    const totalBlockedBotsCount = sitesBlockingAI.reduce((sum, site) => sum + site.aiBotsBlockedCount, 0);
    const averageBotsBlocked = sitesBlockingAICount > 0 ? (totalBlockedBotsCount / sitesBlockingAICount).toFixed(1) : 0;

    const botCounts: { [key: string]: { count: number; owner: string; category: string } } = {};
    const categoryCounts: { [key: string]: number } = {};
    
    sitesBlockingAI.forEach(d => {
      const siteCategories = new Set<string>();
      d.blockedBotsList.forEach(botName => {
        const botInfo = AI_BOTS[botName];
        if (botInfo) {
          if (!botCounts[botName]) {
            botCounts[botName] = { count: 0, owner: botInfo.owner, category: botInfo.category };
          }
          botCounts[botName].count++;
          siteCategories.add(botInfo.category);
        }
      });
      siteCategories.forEach(category => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    });

    const topBlockedBots = Object.entries(botCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([bot, data]) => ({ bot, ...data }));
      
    const categoryAnalysis = Object.entries(categoryCounts)
        .map(([category, count]) => ({
            category,
            count,
            percentage: sitesBlockingAICount > 0 ? (count / sitesBlockingAICount * 100).toFixed(1) : 0
        }))
        .sort((a,b) => b.count - a.count);

    setSummary({
      total, sitesWithRobots, sitesBlockingAICount, sitesWithoutRobots, sitesWithCrawlDelay,
      sitesWithSitemaps, averageBotsBlocked, topBlockedBots, categoryAnalysis,
      percentageBlockingAI: (sitesBlockingAICount / total * 100).toFixed(1),
      // New summary fields
      homepagesChecked,
      sitesWithNoAIMeta,
      sitesWithNoImageAIMeta,
      sitesWithXRobotsNoAI,
      sitesWithXRobotsNoImageAI,
      averageProtectionScore,
      percentageWithNoAIMeta: (sitesWithNoAIMeta / total * 100).toFixed(1),
      percentageWithHeaders: ((sitesWithXRobotsNoAI + sitesWithXRobotsNoImageAI) / total * 100).toFixed(1),
      homepageSuccessRate: (homepagesChecked / total * 100).toFixed(1)
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-white">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          BotScanner
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Comprehensive AI protection analysis across multiple website layers.
        </p>
        <div className="text-sm text-gray-500 max-w-2xl mx-auto">
          <p>This scanner analyzes <strong>both robots.txt files AND homepages</strong> to detect:</p>
          <p>🤖 Robot.txt AI bot blocking • 🏷️ NoAI meta tags • 📡 X-Robots-Tag headers • 🔒 Multi-layer protection scores</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <div className="mb-4">
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                Upload CSV File
              </span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {file && <p className="text-green-600 font-medium">✓ Loaded: {file.name} ({sites.length} outlets)</p>}
          <p className="text-sm text-gray-500 mt-2">Expected CSV format: `Country`, `Outlet`, `Robots.txt` columns</p>
        </div>
      </div>

      {sites.length > 0 && (
        <div className="mb-8 text-center">
          <button onClick={analyzeAllSites} disabled={analyzing} className="flex items-center justify-center w-full sm:w-auto mx-auto gap-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg font-bold">
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
      
      {summary && (
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">Overall Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Globe className="text-blue-600" size={20} /><span className="font-medium text-blue-900">Total Outlets</span></div><p className="text-3xl font-bold text-blue-600">{summary.total}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><CheckCircle className="text-green-600" size={20} /><span className="font-medium text-green-900">Sites Blocking AI</span></div><p className="text-3xl font-bold text-green-600">{summary.sitesBlockingAICount}</p><p className="text-sm text-green-700">{summary.percentageBlockingAI}% of total</p></div>
                <div className="bg-amber-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><AlertCircle className="text-amber-600" size={20} /><span className="font-medium text-amber-900">No robots.txt</span></div><p className="text-3xl font-bold text-amber-600">{summary.sitesWithoutRobots}</p><p className="text-sm text-amber-700">{((summary.sitesWithoutRobots / summary.total) * 100).toFixed(1)}% of total</p></div>
                <div className="bg-purple-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><BarChart3 className="text-purple-600" size={20} /><span className="font-medium text-purple-900">Avg Protection Score</span></div><p className="text-3xl font-bold text-purple-600">{summary.averageProtectionScore}</p><p className="text-sm text-purple-700">multi-layer protection</p></div>
            </div>
            
            {/* New Meta Tags & Headers Section */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Advanced Protection Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.homepagesChecked}</div>
                  <div className="text-sm text-gray-600">Homepages Analyzed</div>
                  <div className="text-xs text-gray-500">{summary.homepageSuccessRate}% success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{summary.sitesWithNoAIMeta}</div>
                  <div className="text-sm text-gray-600">NoAI Meta Tags</div>
                  <div className="text-xs text-gray-500">{summary.percentageWithNoAIMeta}%</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{summary.sitesWithNoImageAIMeta}</div>
                  <div className="text-sm text-gray-600">NoImageAI Meta Tags</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{summary.sitesWithXRobotsNoAI}</div>
                  <div className="text-sm text-gray-600">X-Robots NoAI Headers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{summary.sitesWithXRobotsNoImageAI}</div>
                  <div className="text-sm text-gray-600">X-Robots NoImageAI</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Blocked Bot Category Breakdown</h3>
              <p className="text-sm text-gray-600 mb-4">Percentage of sites that block at least one bot from each category.</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {summary.categoryAnalysis.map((cat: any) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-gray-600">{cat.count} sites ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Top 10 Most Blocked Bots</h3>
              <div className="bg-white rounded-lg border">
                <ul className="divide-y divide-gray-200">
                  {summary.topBlockedBots.map((bot: any, index: number) => (
                    <li key={index} className="p-3 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-800">{bot.bot}</span>
                        <span className="text-sm text-gray-500 ml-2">({bot.owner})</span>
                      </div>
                      <div className="text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-4`}>
                              {bot.category}
                          </span>
                          <span className="font-semibold">{bot.count} sites</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && !analyzing && (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">Detailed Results by Outlet</h2>
            <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Country</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Outlet</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Pages Checked</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocks AI</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Strategy</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Bot Count</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Meta Tags</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Headers</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Protection Score</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocked Bots</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {results.map((result, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-600">{result.country}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.outlet}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col gap-1">
                                        {result.robotsExists ? (
                                          <a href={result.fetchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                            <LinkIcon size={12} /> robots.txt
                                          </a>
                                        ) : (
                                          <span className="text-gray-500 text-xs">No robots.txt</span>
                                        )}
                                        {result.homepageChecked && result.homepageUrl ? (
                                          <a href={result.homepageUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline flex items-center gap-1 text-xs">
                                            <LinkIcon size={12} /> homepage
                                          </a>
                                        ) : (
                                          <span className="text-gray-500 text-xs">Homepage failed</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        result.blocksAI ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                      }`}>
                                        {result.blocksAI ? 'Yes' : 'No'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${strategyColors[result.blockingStrategy]}`}>
                                        {result.blockingStrategy}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{result.aiBotsBlockedCount}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col gap-1">
                                        {result.hasNoAIMetaTag && <span className="inline-flex px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">NoAI</span>}
                                        {result.hasNoImageAIMetaTag && <span className="inline-flex px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">NoImageAI</span>}
                                        {!result.hasNoAIMetaTag && !result.hasNoImageAIMetaTag && <span className="text-gray-500">-</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex flex-col gap-1">
                                        {result.hasXRobotsNoAI && <span className="inline-flex px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded">X-NoAI</span>}
                                        {result.hasXRobotsNoImageAI && <span className="inline-flex px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded">X-NoImageAI</span>}
                                        {!result.hasXRobotsNoAI && !result.hasXRobotsNoImageAI && <span className="text-gray-500">-</span>}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        result.protectionScore >= 15 ? 'bg-red-100 text-red-800' :
                                        result.protectionScore >= 8 ? 'bg-orange-100 text-orange-800' :
                                        result.protectionScore >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                        result.protectionScore > 0 ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {result.protectionScore}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                      {result.blockedBotsList.length > 0 ? result.blockedBotsList.slice(0, 3).join(', ') + (result.blockedBotsList.length > 3 ? '...' : '') : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BotScannerPage;