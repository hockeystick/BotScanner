// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client'; // <-- THIS IS THE CRUCIAL LINE THAT MAKES THE PAGE INTERACTIVE

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Play, BarChart3, AlertCircle, CheckCircle, Globe, Link as LinkIcon, ChevronUp, ChevronDown, Search, Filter, Shield, Bot, Target } from 'lucide-react';

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

type SortField = 'protectionScore' | 'aiBotsBlockedCount' | 'blockingStrategy' | 'country' | 'outlet' | 'hasNoAIMetaTag' | 'hasXRobotsNoAI';
type SortDirection = 'asc' | 'desc';

const BotScannerPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  
  // New UI state
  const [sortBy, setSortBy] = useState<SortField>('protectionScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showProtectedOnly, setShowProtectedOnly] = useState(false);

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

  const getProtectionLevelInfo = (score: number) => {
    if (score >= 20) return { level: 'Fortress', gradient: 'from-red-500 to-pink-600', textColor: 'text-red-700', bgColor: 'bg-red-50' };
    if (score >= 15) return { level: 'Comprehensive', gradient: 'from-orange-500 to-red-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' };
    if (score >= 8) return { level: 'Moderate', gradient: 'from-yellow-500 to-orange-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    if (score >= 3) return { level: 'Basic', gradient: 'from-blue-500 to-cyan-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    return { level: 'None', gradient: 'from-gray-400 to-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' };
  };

  const getBotCategoryColor = (category: string) => {
    switch (category) {
      case 'Major AI': return 'text-red-600 bg-red-50 border-red-200';
      case 'Search': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Web Crawler': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Academic': return 'text-green-600 bg-green-50 border-green-200';
      case 'Social Media': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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
      }).filter(Boolean);
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
    
    score += analysis.aiBotsBlockedCount;
    if (analysis.hasNoAIMetaTag) score += 4;
    if (analysis.hasNoImageAIMetaTag) score += 4;
    if (analysis.hasXRobotsNoAI) score += 5;
    if (analysis.hasXRobotsNoImageAI) score += 5;
    
    if (analysis.robotsExists && analysis.blocksAI && (analysis.hasNoAIMetaTag || analysis.hasXRobotsNoAI)) {
      score += 3;
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
      
      const robotsFetchResult = await fetchRobotsTxt(site['Robots.txt'] || '');
      let analysis = parseRobotsTxt(robotsFetchResult.content, site['Country'] || '', site['Outlet'] || '');
      analysis.fetchUrl = robotsFetchResult.url;
      
      console.log(`Checking homepage for meta tags: ${domain}/`);
      const pageResult = await fetchPageContent(domain);
      if (pageResult) {
        analysis.homepageUrl = pageResult.url;
        analysis.homepageChecked = true;
        
        const metaAnalysis = parseMetaTags(pageResult.content);
        analysis.hasNoAIMetaTag = metaAnalysis.hasNoAI;
        analysis.hasNoImageAIMetaTag = metaAnalysis.hasNoImageAI;
        analysis.metaTagsFound = metaAnalysis.foundTags;
        
        const headerAnalysis = parseXRobotsTags(pageResult.headers);
        analysis.hasXRobotsNoAI = headerAnalysis.hasNoAI;
        analysis.hasXRobotsNoImageAI = headerAnalysis.hasNoImageAI;
        analysis.xRobotsTagsFound = headerAnalysis.foundTags;
        
        analysis.protectionScore = calculateProtectionScore(analysis);
      } else {
        analysis.homepageChecked = false;
        console.warn(`Failed to fetch homepage for: ${domain}`);
      }
      
      analysisResults.push(analysis);
      setProgress(((i + 1) / sites.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 100));
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

    const homepagesChecked = data.filter(d => d.homepageChecked).length;
    const sitesWithNoAIMeta = data.filter(d => d.hasNoAIMetaTag).length;
    const sitesWithNoImageAIMeta = data.filter(d => d.hasNoImageAIMetaTag).length;
    const sitesWithXRobotsNoAI = data.filter(d => d.hasXRobotsNoAI).length;
    const sitesWithXRobotsNoImageAI = data.filter(d => d.hasXRobotsNoImageAI).length;

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

  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ChevronUp className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'desc' ? 
      <ChevronDown className="w-4 h-4 text-blue-600" /> : 
      <ChevronUp className="w-4 h-4 text-blue-600" />;
  };

  // Filtered and sorted results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results.filter(result => {
      // Search filter
      if (searchTerm && !result.outlet.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !result.country.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Protection level filter
      if (filterLevel !== 'all') {
        const levelInfo = getProtectionLevelInfo(result.protectionScore);
        if (levelInfo.level.toLowerCase() !== filterLevel.toLowerCase()) {
          return false;
        }
      }
      
      // Protected only filter
      if (showProtectedOnly && result.protectionScore === 0) {
        return false;
      }
      
      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'protectionScore':
          aValue = a.protectionScore;
          bValue = b.protectionScore;
          break;
        case 'aiBotsBlockedCount':
          aValue = a.aiBotsBlockedCount;
          bValue = b.aiBotsBlockedCount;
          break;
        case 'blockingStrategy':
          const strategyOrder = { 'None': 0, 'Basic': 1, 'Moderate': 2, 'Comprehensive': 3, 'Extensive': 4 };
          aValue = strategyOrder[a.blockingStrategy as keyof typeof strategyOrder] || 0;
          bValue = strategyOrder[b.blockingStrategy as keyof typeof strategyOrder] || 0;
          break;
        case 'hasNoAIMetaTag':
          aValue = a.hasNoAIMetaTag ? 1 : 0;
          bValue = b.hasNoAIMetaTag ? 1 : 0;
          break;
        case 'hasXRobotsNoAI':
          aValue = a.hasXRobotsNoAI ? 1 : 0;
          bValue = b.hasXRobotsNoAI ? 1 : 0;
          break;
        case 'country':
          aValue = a.country;
          bValue = b.country;
          break;
        case 'outlet':
          aValue = a.outlet;
          bValue = b.outlet;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      const comparison = (aValue as number) - (bValue as number);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [results, searchTerm, filterLevel, showProtectedOnly, sortBy, sortDirection]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            <h1 className="text-5xl font-bold mb-2">🛡️ BotScanner</h1>
          </div>
          <p className="text-xl text-gray-700 mb-3 font-medium">
            Comprehensive AI Protection Analysis Platform
          </p>
          <div className="text-sm text-gray-600 max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <p className="mb-2">🔍 <strong>Multi-Layer Detection System</strong></p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><Bot className="w-4 h-4" /> Robot.txt Blocking</span>
              <span className="flex items-center gap-1"><Target className="w-4 h-4" /> NoAI Meta Tags</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> X-Robots Headers</span>
              <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Protection Scoring</span>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-white to-blue-50/50 border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center shadow-lg backdrop-blur-sm">
            <Upload className="mx-auto text-blue-500 mb-4" size={48} />
            <div className="mb-4">
              <label className="cursor-pointer">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                  📁 Upload CSV File
                </span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {file && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
                <p className="text-green-700 font-medium">✅ {file.name}</p>
                <p className="text-green-600 text-sm">{sites.length} outlets loaded</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-3">Expected format: Country, Outlet, Robots.txt columns</p>
          </div>
        </div>

        {/* Analyze Button */}
        {sites.length > 0 && (
          <div className="mb-8 text-center">
            <button 
              onClick={analyzeAllSites} 
              disabled={analyzing} 
              className="flex items-center justify-center w-full sm:w-auto mx-auto gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
            >
              <Play size={24} />
              {analyzing ? `🔍 Analyzing... ${Math.round(progress)}%` : '🚀 Analyze All Sites'}
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {analyzing && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-300 shadow-sm" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center mt-2 text-sm text-gray-600">Processing {Math.round(progress)}% complete</p>
          </div>
        )}
        
        {/* Summary Dashboard */}
        {summary && (
          <div className="space-y-8 mb-12">
            {/* Main Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gradient-to-r from-blue-500 to-purple-500">
                📊 Analysis Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-6 h-6" />
                    <span className="font-semibold">Total Sites</span>
                  </div>
                  <p className="text-4xl font-bold">{summary.total}</p>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-6 h-6" />
                    <span className="font-semibold">Protected Sites</span>
                  </div>
                  <p className="text-4xl font-bold">{summary.sitesBlockingAICount}</p>
                  <p className="text-emerald-100 text-sm">{summary.percentageBlockingAI}% of total</p>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-semibold">Unprotected</span>
                  </div>
                  <p className="text-4xl font-bold">{summary.sitesWithoutRobots}</p>
                  <p className="text-orange-100 text-sm">{((summary.sitesWithoutRobots / summary.total) * 100).toFixed(1)}% no robots.txt</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="w-6 h-6" />
                    <span className="font-semibold">Avg Score</span>
                  </div>
                  <p className="text-4xl font-bold">{summary.averageProtectionScore}</p>
                  <p className="text-purple-100 text-sm">protection level</p>
                </div>
              </div>
            </div>

            {/* Advanced Protection Methods */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-lg border border-indigo-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                🔬 Advanced Protection Methods
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center bg-white p-4 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-green-600">{summary.homepagesChecked}</div>
                  <div className="text-sm text-gray-600">Homepages Analyzed</div>
                  <div className="text-xs text-green-500">{summary.homepageSuccessRate}% success</div>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-indigo-600">{summary.sitesWithNoAIMeta}</div>
                  <div className="text-sm text-gray-600">NoAI Meta Tags</div>
                  <div className="text-xs text-indigo-500">{summary.percentageWithNoAIMeta}%</div>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-indigo-600">{summary.sitesWithNoImageAIMeta}</div>
                  <div className="text-sm text-gray-600">NoImageAI Tags</div>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-pink-600">{summary.sitesWithXRobotsNoAI}</div>
                  <div className="text-sm text-gray-600">X-Robots NoAI</div>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-md">
                  <div className="text-3xl font-bold text-pink-600">{summary.sitesWithXRobotsNoImageAI}</div>
                  <div className="text-sm text-gray-600">X-Robots Images</div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category Breakdown */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  📈 Bot Category Breakdown
                </h3>
                <p className="text-sm text-gray-600 mb-4">Sites blocking each bot category</p>
                <div className="space-y-4">
                  {summary.categoryAnalysis.map((cat: any) => (
                    <div key={cat.category} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className={`font-medium px-2 py-1 rounded ${getBotCategoryColor(cat.category)}`}>
                          {cat.category}
                        </span>
                        <span className="text-gray-600 font-semibold">{cat.count} sites ({cat.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${cat.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Blocked Bots */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  🏆 Most Blocked Bots
                </h3>
                <div className="space-y-3">
                  {summary.topBlockedBots.slice(0, 8).map((bot: any, index: number) => (
                    <div key={bot.bot} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                          index < 3 ? 'from-yellow-400 to-orange-500' : 'from-gray-400 to-gray-500'
                        } flex items-center justify-center text-white font-bold text-sm`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{bot.bot}</span>
                          <span className="text-sm text-gray-500 ml-2">({bot.owner})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBotCategoryColor(bot.category)}`}>
                          {bot.category}
                        </span>
                        <span className="font-bold text-lg">{bot.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && !analyzing && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            {/* Search and Filter Controls */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                📋 Detailed Analysis Results
              </h2>
              <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search outlets or countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter Level */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="fortress">🔴 Fortress</option>
                  <option value="comprehensive">🟠 Comprehensive</option>
                  <option value="moderate">🟡 Moderate</option>
                  <option value="basic">🔵 Basic</option>
                  <option value="none">⚪ None</option>
                </select>
                
                {/* Protected Only Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProtectedOnly}
                    onChange={(e) => setShowProtectedOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Protected Only</span>
                </label>
                
                <div className="text-sm text-gray-600">
                  Showing {filteredAndSortedResults.length} of {results.length} sites
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-blue-100">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-900">Country</th>
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-900">Outlet</th>
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-900">Pages Checked</th>
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-900">Blocks AI</th>
                    
                    <th 
                      className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => handleSort('protectionScore')}
                    >
                      <div className="flex items-center gap-1">
                        🛡️ Score {getSortIcon('protectionScore')}
                      </div>
                    </th>
                    
                    <th 
                      className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => handleSort('aiBotsBlockedCount')}
                    >
                      <div className="flex items-center gap-1">
                        🤖 Bots {getSortIcon('aiBotsBlockedCount')}
                      </div>
                    </th>
                    
                    <th 
                      className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => handleSort('hasNoAIMetaTag')}
                    >
                      <div className="flex items-center gap-1">
                        🏷️ Meta {getSortIcon('hasNoAIMetaTag')}
                      </div>
                    </th>
                    
                    <th 
                      className="px-4 py-4 text-left text-sm font-bold text-gray-900 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => handleSort('hasXRobotsNoAI')}
                    >
                      <div className="flex items-center gap-1">
                        📡 Headers {getSortIcon('hasXRobotsNoAI')}
                      </div>
                    </th>
                    
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-900">Blocked Bots</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedResults.map((result, index) => {
                    const levelInfo = getProtectionLevelInfo(result.protectionScore);
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-l-4 ${levelInfo.bgColor} border-l-${levelInfo.gradient.split(' ')[1].split('-')[1]}-400`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-700 font-medium">{result.country}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-900">{result.outlet}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            {result.robotsExists ? (
                              <a href={result.fetchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium hover:underline">
                                <LinkIcon size={12} /> robots.txt
                              </a>
                            ) : (
                              <span className="text-red-500 text-xs">❌ No robots.txt</span>
                            )}
                            {result.homepageChecked && result.homepageUrl ? (
                              <a href={result.homepageUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs font-medium hover:underline">
                                <LinkIcon size={12} /> homepage
                              </a>
                            ) : (
                              <span className="text-orange-500 text-xs">⚠️ Homepage failed</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                            result.blocksAI ? 'bg-emerald-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg'
                          }`}>
                            {result.blocksAI ? '✅ Yes' : '❌ No'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full text-white bg-gradient-to-r ${levelInfo.gradient} shadow-lg`}>
                              {result.protectionScore}
                            </span>
                            <span className="text-xs text-gray-500">{levelInfo.level}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-lg font-bold text-gray-900">{result.aiBotsBlockedCount}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {result.hasNoAIMetaTag && <span className="inline-flex px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full font-medium">NoAI</span>}
                            {result.hasNoImageAIMetaTag && <span className="inline-flex px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full font-medium">NoImageAI</span>}
                            {!result.hasNoAIMetaTag && !result.hasNoImageAIMetaTag && <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {result.hasXRobotsNoAI && <span className="inline-flex px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full font-medium">X-NoAI</span>}
                            {result.hasXRobotsNoImageAI && <span className="inline-flex px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full font-medium">X-NoImageAI</span>}
                            {!result.hasXRobotsNoAI && !result.hasXRobotsNoImageAI && <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                          {result.blockedBotsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {result.blockedBotsList.slice(0, 3).map(bot => (
                                <span key={bot} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  {bot}
                                </span>
                              ))}
                              {result.blockedBotsList.length > 3 && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                  +{result.blockedBotsList.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotScannerPage;