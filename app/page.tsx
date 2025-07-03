// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Play, BarChart3, AlertCircle, CheckCircle, Globe, Link as LinkIcon, ChevronUp, ChevronDown, Search, Shield, Bot, Target, Zap, FileText } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type SiteData = { [key: string]: string };
type FetchResult = { content: string; status: string; error: boolean; url: string };
type PageFetchResult = { content: string; headers: Record<string, string>; url: string };
type AnalysisResult = {
  country: string; outlet: string; robotsExists: boolean; blocksAI: boolean; aiBotsBlockedCount: number; blockingStrategy: string;
  blockedBotsList: string[]; hasSitemaps: boolean; hasCrawlDelay: boolean; fetchUrl?: string; hasNoAIMetaTag: boolean;
  hasNoImageAIMetaTag: boolean; hasXRobotsNoAI: boolean; hasXRobotsNoImageAI: boolean; metaTagsFound: string[];
  xRobotsTagsFound: string[]; protectionScore: number; homepageUrl?: string; homepageChecked: boolean;
};
type SortField = 'protectionScore' | 'aiBotsBlockedCount' | 'outlet' | 'country';
type SortDirection = 'asc' | 'desc';

// --- MAIN COMPONENT ---
const BotScannerPage = () => {
  // --- STATE MANAGEMENT ---
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [singleDomain, setSingleDomain] = useState('');
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [analyzingSingle, setAnalyzingSingle] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('protectionScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showProtectedOnly, setShowProtectedOnly] = useState(false);

  // --- DATA & CONFIGURATION ---
  const AI_BOTS: { [key: string]: { owner: string; category: string } } = {
    'GPTBot': { owner: 'OpenAI', category: 'Major AI' }, 'ChatGPT-User': { owner: 'OpenAI', category: 'Major AI' }, 'OAI-SearchBot': { owner: 'OpenAI', category: 'Major AI' }, 'Google-Extended': { owner: 'Google', category: 'Major AI' }, 'anthropic-ai': { owner: 'Anthropic', category: 'Major AI' }, 'ClaudeBot': { owner: 'Anthropic', category: 'Major AI' }, 'Claude-Web': { owner: 'Anthropic', category: 'Major AI' }, 'Claude-User': { owner: 'Anthropic', category: 'Major AI'}, 'Claude-SearchBot': { owner: 'Anthropic', category: 'Major AI'}, 'cohere-ai': { owner: 'Cohere', category: 'Major AI' }, 'MistralAI-User': { owner: 'Mistral', category: 'Major AI' }, 'FacebookBot': { owner: 'Meta', category: 'Social Media' }, 'Meta-ExternalAgent': { owner: 'Meta', category: 'Social Media' }, 'meta-externalagent': { owner: 'Meta', category: 'Social Media' },
    'PerplexityBot': { owner: 'Perplexity', category: 'Search' }, 'Perplexity-User': { owner: 'Perplexity', category: 'Search' }, 'YouBot': { owner: 'You.com', category: 'Search' }, 'DuckAssistBot': { owner: 'DuckDuckGo', category: 'Search' }, 'PetalBot': { owner: 'Petal Search', category: 'Search'},
    'Bytespider': { owner: 'ByteDance', category: 'Web Crawler' }, 'TikTokSpider': { owner: 'ByteDance', category: 'Web Crawler' }, 'CCBot': { owner: 'Common Crawl', category: 'Web Crawler' }, 'AhrefsBot': { owner: 'Ahrefs', category: 'SEO' }, 'Applebot': { owner: 'Apple', category: 'Web Crawler' }, 'Applebot-Extended': { owner: 'Apple', category: 'Web Crawler' }, 'Amazonbot': { owner: 'Amazon', category: 'Web Crawler' }, 'Diffbot': { owner: 'Diffbot', category: 'Web Crawler' },
    'AI2Bot': { owner: 'Allen Institute', category: 'Academic' }, 'Ai2Bot-Dolma': { owner: 'Allen Institute', category: 'Academic' }, 'img2dataset': { owner: 'Academic', category: 'Academic' }, 'news-please': { owner: 'Academic', category: 'Academic' }, 'magpie-crawler': { owner: 'Academic', category: 'Academic' },
    'Omgilibot': { owner: 'Omgili', category: 'Generic' }, 'omgili': { owner: 'Omgili', category: 'Generic' },
  };

  // --- UI HELPER FUNCTIONS ---
  const getProtectionLevelInfo = (score: number) => {
    if (score >= 20) return { level: 'Fortress', gradient: 'from-red-500 to-pink-600', color: 'red' };
    if (score >= 15) return { level: 'Strong', gradient: 'from-orange-500 to-red-500', color: 'orange' };
    if (score >= 8) return { level: 'Moderate', gradient: 'from-yellow-500 to-orange-500', color: 'yellow' };
    if (score >= 3) return { level: 'Basic', gradient: 'from-blue-500 to-cyan-500', color: 'blue' };
    return { level: 'None', gradient: 'from-gray-400 to-gray-500', color: 'gray' };
  };

  const getBotCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Major AI': 'text-red-600 bg-red-50 border-red-200',
      'Search': 'text-purple-600 bg-purple-50 border-purple-200',
      'Social Media': 'text-orange-600 bg-orange-50 border-orange-200',
      'Web Crawler': 'text-blue-600 bg-blue-50 border-blue-200',
      'SEO': 'text-teal-600 bg-teal-50 border-teal-200',
      'Academic': 'text-green-600 bg-green-50 border-green-200',
      'Generic': 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[category] || colors['Generic'];
  };

  // --- CORE LOGIC FUNCTIONS ---
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += char;
    }
    result.push(current);
    return result.map(s => s.replace(/^"|"$/g, ''));
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string; if (!text) return;
      const lines = text.split(/\r?\n/); if (lines.length < 2) return;
      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map(line => {
        if (!line.trim()) return null;
        try {
          const values = parseCSVLine(line);
          return headers.reduce((obj, header, index) => ({...obj, [header]: values[index] || ''}), {} as SiteData);
        } catch (error) { console.warn(`Error parsing line:`, error); return null; }
      }).filter(Boolean);
      setSites(data as SiteData[]);
    };
    reader.readAsText(file);
  }, []);

  const fetchWithProxy = async (url: string, type: 'robots' | 'page'): Promise<any> => {
    const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(url)}&type=${type}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
    }
    return response.json();
  };

  const analyzeSingleDomain = async () => {
    setAnalyzingSingle(true); setSingleResult(null);
    try {
        let domain = singleDomain.trim(); if (!domain.startsWith('http')) domain = `https://${domain}`;
        const urlObject = new URL(domain);
        const result = await performFullAnalysis({ 'Outlet': urlObject.hostname, 'Country': 'N/A', 'Robots.txt': `https://${urlObject.hostname}/robots.txt` });
        setSingleResult(result);
    } catch (e) {
      console.error("Analysis failed", e);
      // You could set an error state here to show in the UI
    } finally {
      setAnalyzingSingle(false);
    }
  };
  
  const analyzeAllSites = async () => {
    setAnalyzing(true); setProgress(0); setResults([]); setSummary(null);
    const analysisResults: AnalysisResult[] = [];
    for (let i = 0; i < sites.length; i++) {
        const result = await performFullAnalysis(sites[i]);
        if(result) analysisResults.push(result);
        setProgress(((i + 1) / sites.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    setResults(analysisResults);
    generateSummary(analysisResults);
    setAnalyzing(false);
  };

  const performFullAnalysis = async (site: SiteData): Promise<AnalysisResult | null> => {
    try {
      let domainUrl = site['Robots.txt'] || site['Outlet'] || '';
      if (!domainUrl.startsWith('http')) domainUrl = `https://${domainUrl}`;
      const urlObject = new URL(domainUrl);
      const baseUrl = `${urlObject.protocol}//${urlObject.hostname}`;

      let analysis: Partial<AnalysisResult> & { outlet: string; country: string } = {
          outlet: site['Outlet'] || urlObject.hostname,
          country: site['Country'] || 'N/A',
      };

      // Robots.txt Analysis
      try {
        const robotsData = await fetchWithProxy(`${baseUrl}/robots.txt`, 'robots');
        const robotsAnalysis = parseRobotsTxt(robotsData.content);
        analysis = { ...analysis, ...robotsAnalysis, fetchUrl: `${baseUrl}/robots.txt` };
      } catch (e) {
        analysis = { ...analysis, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [], hasSitemaps: false, hasCrawlDelay: false };
      }

      // Homepage Analysis for Meta/Headers
      try {
        const pageData = await fetchWithProxy(baseUrl, 'page');
        const meta = parseMetaTags(pageData.content);
        const headers = parseXRobotsTags(pageData.headers);
        analysis = { ...analysis, ...meta, ...headers, homepageUrl: baseUrl, homepageChecked: true };
      } catch (e) {
        analysis = { ...analysis, hasNoAIMetaTag: false, hasNoImageAIMetaTag: false, hasXRobotsNoAI: false, hasXRobotsNoImageAI: false, metaTagsFound: [], xRobotsTagsFound: [], homepageChecked: false };
      }

      analysis.protectionScore = calculateProtectionScore(analysis as Omit<AnalysisResult, 'protectionScore'>);
      return analysis as AnalysisResult;

    } catch (error) {
        console.error(`Failed to analyze ${site['Outlet']}:`, error);
        return null;
    }
  };

  const parseRobotsTxt = (content: string) => {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blockedBots = new Set<string>(); let currentAgent: string | null = null;
    let hasSitemaps = false; let hasCrawlDelay = false;
    lines.forEach(line => {
        const trimmed = line.trim(); const lower = trimmed.toLowerCase();
        if (!trimmed || lower.startsWith('#')) return;
        if (lower.startsWith('user-agent:')) currentAgent = trimmed.substring(11).trim();
        else if (lower.startsWith('disallow:') && currentAgent) {
            if (trimmed.substring(9).trim() === '/') {
                Object.keys(AI_BOTS).forEach(bot => { if (currentAgent === '*' || currentAgent!.toLowerCase() === bot.toLowerCase()) blockedBots.add(bot); });
            }
        } else if (lower.startsWith('sitemap:')) hasSitemaps = true;
        else if (lower.startsWith('crawl-delay:')) hasCrawlDelay = true;
    });
    const count = blockedBots.size;
    let strategy = 'None';
    if (count > 20) strategy = 'Fortress';
    else if (count > 10) strategy = 'Strong';
    else if (count > 3) strategy = 'Moderate';
    else if (count > 0) strategy = 'Basic';
    return { robotsExists: true, blocksAI: count > 0, aiBotsBlockedCount: count, blockingStrategy: strategy, blockedBotsList: Array.from(blockedBots).sort(), hasSitemaps, hasCrawlDelay };
  };
  
  const parseMetaTags = (html: string) => {
    let hasNoAI = false, hasNoImageAI = false; const found: string[] = [];
    const metaRegex = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/gi; let match;
    while((match = metaRegex.exec(html)) !== null) {
      found.push(match[1]); const content = match[1].toLowerCase();
      if(content.includes('noai')) hasNoAI = true; if(content.includes('noimageai')) hasNoImageAI = true;
    }
    return { hasNoAIMetaTag: hasNoAI, hasNoImageAIMetaTag: hasNoImageAI, metaTagsFound: found };
  };

  const parseXRobotsTags = (headers: Record<string, string>) => {
    const tag = headers['x-robots-tag'] || headers['X-Robots-Tag']; let hasNoAI = false, hasNoImageAI = false;
    if(tag) { const lower = tag.toLowerCase(); if(lower.includes('noai')) hasNoAI = true; if(lower.includes('noimageai')) hasNoImageAI = true; }
    return { hasXRobotsNoAI: hasNoAI, hasXRobotsNoImageAI: hasNoImageAI, xRobotsTagsFound: tag ? [tag] : [] };
  };

  const calculateProtectionScore = (a: Omit<AnalysisResult, 'protectionScore'>) => {
    let score = a.aiBotsBlockedCount * 0.5;
    if(a.hasNoAIMetaTag) score += 4; if(a.hasNoImageAIMetaTag) score += 2;
    if(a.hasXRobotsNoAI) score += 5; if(a.hasXRobotsNoImageAI) score += 3;
    if(a.blocksAI && (a.hasNoAIMetaTag || a.hasXRobotsNoAI)) score += 3; // Synergy bonus
    return Math.round(score);
  };

  const generateSummary = (data: AnalysisResult[]) => {
    const total = data.length; if (total === 0) return;
    const stats = {
      sitesWithRobots: data.filter(d => d.robotsExists).length,
      sitesBlockingAI: data.filter(d => d.blocksAI).length,
      sitesWithNoAIMeta: data.filter(d => d.hasNoAIMetaTag).length,
      sitesWithXRobotsNoAI: data.filter(d => d.hasXRobotsNoAI).length,
      homepagesChecked: data.filter(d => d.homepageChecked).length,
      averageProtectionScore: (data.reduce((sum, site) => sum + site.protectionScore, 0) / total).toFixed(1),
    };
    
    const botCounts: { [key: string]: { count: number; owner: string; category: string } } = {};
    const categoryCounts: { [key: string]: number } = {};
    data.filter(d => d.blocksAI).forEach(d => {
      const cats = new Set<string>();
      d.blockedBotsList.forEach(bot => {
        const info = AI_BOTS[bot];
        if(info) {
          if(!botCounts[bot]) botCounts[bot] = { count: 0, ...info}; botCounts[bot].count++; cats.add(info.category);
        }
      });
      cats.forEach(c => categoryCounts[c] = (categoryCounts[c] || 0) + 1);
    });

    const topBlockedBots = Object.entries(botCounts).sort((a,b) => b[1].count - a[1].count).slice(0,8).map(([bot,data]) => ({bot, ...data}));
    const categoryAnalysis = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]).map(([category, count]) => ({ category, count, percentage: (count / stats.sitesBlockingAI * 100).toFixed(1)}));
    
    setSummary({ total, ...stats, topBlockedBots, categoryAnalysis });
  };
  
  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDirection('desc'); }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ChevronUp className="w-4 h-4 text-gray-400 opacity-50" />;
    return sortDirection === 'desc' ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronUp className="w-4 h-4 text-blue-600" />;
  };

  const filteredAndSortedResults = useMemo(() => {
    return results
      .filter(r => {
        const levelInfo = getProtectionLevelInfo(r.protectionScore);
        const termMatch = searchTerm ? r.outlet.toLowerCase().includes(searchTerm.toLowerCase()) || r.country.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const levelMatch = filterLevel !== 'all' ? levelInfo.level.toLowerCase() === filterLevel : true;
        const protectedMatch = showProtectedOnly ? r.protectionScore > 0 : true;
        return termMatch && levelMatch && protectedMatch;
      })
      .sort((a, b) => {
        const aVal = a[sortBy] as any; const bVal = b[sortBy] as any;
        const comparison = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [results, searchTerm, filterLevel, showProtectedOnly, sortBy, sortDirection]);

  // --- RENDER FUNCTIONS ---
  const renderSingleResult = () => {
    if (!singleResult) return null;
    const levelInfo = getProtectionLevelInfo(singleResult.protectionScore);
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Search size={24} className="text-blue-600" /> Analysis for <span className="text-blue-700">{singleResult.outlet || 'Domain'}</span>
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
            <p className="text-gray-600 font-semibold">Overall Protection Score</p>
            <div className={`text-6xl font-bold my-2 bg-clip-text text-transparent bg-gradient-to-r ${levelInfo.gradient}`}>{singleResult.protectionScore}</div>
            <div className={`inline-block px-4 py-1 text-lg font-bold rounded-full text-white bg-gradient-to-r ${levelInfo.gradient} shadow-md`}>{levelInfo.level}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg"><strong>{singleResult.aiBotsBlockedCount}</strong> AI Bots Blocked via robots.txt</div>
            <div className="p-4 bg-gray-50 rounded-lg"><strong>{singleResult.hasNoAIMetaTag ? 'Yes' : 'No'}</strong> `noai` Meta Tag</div>
            <div className="p-4 bg-gray-50 rounded-lg"><strong>{singleResult.hasXRobotsNoAI ? 'Yes' : 'No'}</strong> `noai` X-Robots-Tag Header</div>
            <div className="p-4 bg-gray-50 rounded-lg"><strong>{singleResult.robotsExists ? 'Yes' : 'No'}</strong> robots.txt file found</div>
          </div>
          <div className="flex gap-4 justify-center text-sm font-medium">
            {singleResult.fetchUrl && <a href={singleResult.fetchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><LinkIcon size={14}/>View robots.txt</a>}
            {singleResult.homepageUrl && <a href={singleResult.homepageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline"><LinkIcon size={14}/>View homepage</a>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">🛡️ BotScanner</h1>
          <p className="text-xl text-gray-700 font-medium">Comprehensive AI Protection Analysis Platform</p>
          <div className="mt-4 inline-block bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><Bot className="w-4 h-4 text-blue-500"/>robots.txt</span>
              <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-purple-500"/>Meta Tags</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-red-500"/>HTTP Headers</span>
              <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-green-500"/>Protection Scoring</span>
            </div>
          </div>
        </header>

        <nav className="mb-10 flex justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-white/20">
                <div className="flex gap-1">
                    {([['single', 'Quick Check', Zap], ['bulk', 'Bulk Analysis', FileText]] as const).map(([id, text, Icon]) => (
                        <button key={id} onClick={() => setMode(id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                                mode === id ? 'bg-white text-blue-700 shadow-md' : 'text-gray-600 hover:text-blue-600'
                            }`}>
                            <Icon size={18} /> {text}
                        </button>
                    ))}
                </div>
            </div>
        </nav>

        {mode === 'single' && (
          <section className="space-y-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-white to-blue-100/30 border border-gray-200/50 rounded-2xl p-8 text-center shadow-xl backdrop-blur-sm">
                <Zap className="mx-auto text-blue-500 mb-4" size={48} />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Check a Single Domain</h2>
                <div className="flex gap-2">
                    <input type="text" placeholder="e.g., example.com" value={singleDomain} onChange={(e) => setSingleDomain(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && analyzeSingleDomain()}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus-visible:outline-none"/>
                    <button onClick={analyzeSingleDomain} disabled={!singleDomain.trim() || analyzingSingle}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:scale-100 disabled:shadow-lg">
                        {analyzingSingle ? '...' : 'Analyze'}
                    </button>
                </div>
            </div>
            {analyzingSingle && <div className="text-center text-blue-600 font-semibold">Analyzing...</div>}
            {singleResult && renderSingleResult()}
          </section>
        )}

        {mode === 'bulk' && (
          <section className="space-y-8">
            <div className="bg-gradient-to-br from-white to-blue-100/30 border border-gray-200/50 rounded-2xl p-8 text-center shadow-xl backdrop-blur-sm">
                <Upload className="mx-auto text-blue-500 mb-4" size={48} />
                <label className="cursor-pointer">
                    <span className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        📁 Upload CSV File
                    </span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                {file && <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 inline-block"><p className="text-green-700 font-medium">✅ {file.name} ({sites.length} sites loaded)</p></div>}
            </div>

            {sites.length > 0 && (
              <div className="text-center">
                <button onClick={analyzeAllSites} disabled={analyzing} className="flex items-center justify-center w-full sm:w-auto mx-auto gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:scale-100">
                    <Play size={24} /> {analyzing ? `Analyzing... ${Math.round(progress)}%` : 'Analyze All Sites'}
                </button>
              </div>
            )}

            {analyzing && <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner"><div className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>}
            
            {summary && (
              <div className="space-y-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">📊 Analysis Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Summary Cards */}
                        {[
                            { icon: Globe, label: 'Total Sites', value: summary.total, gradient: 'from-blue-500 to-blue-600' },
                            { icon: Shield, label: 'Protected Sites', value: summary.sitesBlockingAI, sub: `${(summary.sitesBlockingAI / summary.total * 100).toFixed(0)}%`, gradient: 'from-emerald-500 to-emerald-600' },
                            { icon: Target, label: 'Meta Tag Protected', value: summary.sitesWithNoAIMeta, sub: `${(summary.sitesWithNoAIMeta / summary.total * 100).toFixed(0)}%`, gradient: 'from-indigo-500 to-purple-600' },
                            { icon: BarChart3, label: 'Avg. Score', value: summary.averageProtectionScore, gradient: 'from-amber-500 to-orange-500' },
                        ].map(s => (
                            <div key={s.label} className={`p-5 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br ${s.gradient}`}>
                                <div className="flex items-center gap-3 mb-2"><s.icon className="w-6 h-6" /><span className="font-semibold">{s.label}</span></div>
                                <p className="text-4xl font-bold">{s.value}</p>
                                {s.sub && <p className="opacity-80 text-sm">{s.sub} of total</p>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">📈 Bot Category Breakdown</h3><div className="space-y-4">{summary.categoryAnalysis.map((c:any) => <div key={c.category}><div className="flex justify-between items-center text-sm mb-1"><span className={`font-medium px-2 py-0.5 rounded ${getBotCategoryColor(c.category)}`}>{c.category}</span><span className="text-gray-600 font-semibold">{c.count} sites</span></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full" style={{width: `${c.percentage}%`}}></div></div></div>)}</div></div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"><h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">🏆 Top Blocked Bots</h3><div className="space-y-3">{summary.topBlockedBots.map((b:any, i:number) => <div key={b.bot} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${i<3 ? 'from-yellow-400 to-orange-500':'from-gray-400 to-gray-500'}`}>{i+1}</div><div><span className="font-medium text-gray-800">{b.bot}</span><span className="text-sm text-gray-500 ml-2">({b.owner})</span></div></div><div className="font-bold text-lg">{b.count}</div></div>)}</div></div>
                </div>
              </div>
            )}
            
            {results.length > 0 && !analyzing && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-200"><h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">📋 Detailed Analysis Results</h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-64"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/><input type="text" placeholder="Search outlets or countries..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"/></div>
                    <select value={filterLevel} onChange={e=>setFilterLevel(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="all">All Levels</option><option value="fortress">Fortress</option><option value="strong">Strong</option><option value="moderate">Moderate</option><option value="basic">Basic</option><option value="none">None</option></select>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showProtectedOnly} onChange={e=>setShowProtectedOnly(e.target.checked)} className="rounded border-gray-300 text-blue-600"/><span>Protected Only</span></label>
                    <div className="text-sm text-gray-600">Showing {filteredAndSortedResults.length} of {results.length}</div>
                  </div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="bg-gray-100/80"><tr>
                    {[['country', 'Country'], ['outlet', 'Outlet'], ['protectionScore', 'Score'], ['aiBotsBlockedCount', 'Bots']].map(([field, label]) => (
                      <th key={field} className="px-4 py-3 text-left font-bold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={()=>handleSort(field as SortField)}><div className="flex items-center gap-1">{label} {getSortIcon(field as SortField)}</div></th>
                    ))}
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Protection Layers</th><th className="px-4 py-3 text-left font-bold text-gray-700">Blocked Bots (Top 3)</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedResults.map((r, i) => {
                      const levelInfo = getProtectionLevelInfo(r.protectionScore);
                      return (<tr key={i} className={`border-l-4 hover:bg-blue-50/50 transition-colors`} style={{borderColor: levelInfo.color}}>
                          <td className="px-4 py-3 text-gray-700">{r.country}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{r.outlet}</td>
                          <td className="px-4 py-3"><div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-white text-lg bg-gradient-to-br ${levelInfo.gradient}`}>{r.protectionScore}</div></td>
                          <td className="px-4 py-3 font-bold text-lg text-center">{r.aiBotsBlockedCount}</td>
                          <td className="px-4 py-3"><div className="flex flex-col gap-1.5">{[
                            { cond: r.robotsExists, label: 'robots.txt', link: r.fetchUrl, color: 'text-blue-600' },
                            { cond: r.hasNoAIMetaTag, label: 'Meta `noai`', link: r.homepageUrl, color: 'text-purple-600'},
                            { cond: r.hasXRobotsNoAI, label: 'Header `noai`', link: r.homepageUrl, color: 'text-red-600'}
                          ].map(p=>p.cond ? <a key={p.label} href={p.link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 font-semibold hover:underline ${p.color}`}><CheckCircle size={14}/>{p.label}</a> : null)}</div></td>
                          <td className="px-4 py-3 max-w-xs"><div className="flex flex-wrap gap-1">{r.blockedBotsList.length > 0 ? r.blockedBotsList.slice(0,3).map(b=><span key={b} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{b}</span>) : <span className="text-gray-400">-</span>}{r.blockedBotsList.length>3&&<span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">+{r.blockedBotsList.length-3}</span>}</div></td>
                      </tr>)
                    })}
                  </tbody>
                </table></div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default BotScannerPage;