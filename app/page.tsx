// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Play, BarChart3, AlertCircle, CheckCircle, Globe } from 'lucide-react';

// Define types for our data structures to make the code safer
type SiteData = { [key: string]: string };

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
  hasCrawlDelay: boolean;
  fetchUrl?: string;
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
    'GPTBot': { owner: 'OpenAI', category: 'Major AI' },
    'ChatGPT-User': { owner: 'OpenAI', category: 'Major AI' },
    'OAI-SearchBot': { owner: 'OpenAI', category: 'Major AI' },
    'Google-Extended': { owner: 'Google', category: 'Major AI' },
    'anthropic-ai': { owner: 'Anthropic', category: 'Major AI' },
    'ClaudeBot': { owner: 'Anthropic', category: 'Major AI' },
    'Claude-Web': { owner: 'Anthropic', category: 'Major AI' },
    'Claude-User': { owner: 'Anthropic', category: 'Major AI'},
    'Claude-SearchBot': { owner: 'Anthropic', category: 'Major AI'},
    'cohere-ai': { owner: 'Cohere', category: 'Major AI' },
    'MistralAI-User': { owner: 'Mistral', category: 'Major AI' },
    'FacebookBot': { owner: 'Meta', category: 'Social Media' },
    'Meta-ExternalAgent': { owner: 'Meta', category: 'Social Media' },
    'meta-externalagent': { owner: 'Meta', category: 'Social Media' },

    // Search & Aggregators
    'PerplexityBot': { owner: 'Perplexity', category: 'Search' },
    'Perplexity-User': { owner: 'Perplexity', category: 'Search' },
    'YouBot': { owner: 'You.com', category: 'Search' },
    'DuckAssistBot': { owner: 'DuckDuckGo', category: 'Search' },
    'PetalBot': { owner: 'Petal Search', category: 'Search'},

    // Web Crawlers / SEO
    'Bytespider': { owner: 'ByteDance', category: 'Web Crawler' },
    'TikTokSpider': { owner: 'ByteDance', category: 'Web Crawler' },
    'CCBot': { owner: 'Common Crawl', category: 'Web Crawler' },
    'AhrefsBot': { owner: 'Ahrefs', category: 'SEO' },
    'Applebot': { owner: 'Apple', category: 'Web Crawler' },
    'Applebot-Extended': { owner: 'Apple', category: 'Web Crawler' },
    'Amazonbot': { owner: 'Amazon', category: 'Web Crawler' },
    'Diffbot': { owner: 'Diffbot', category: 'Web Crawler' },
    
    // Academic & Other
    'AI2Bot': { owner: 'Allen Institute', category: 'Academic' },
    'Ai2Bot-Dolma': { owner: 'Allen Institute', category: 'Academic' },
    'img2dataset': { owner: 'Academic', category: 'Academic' },
    'news-please': { owner: 'Academic', category: 'Academic' },
    'magpie-crawler': { owner: 'Academic', category: 'Academic' },

    // Unknown or Generic
    'Omgilibot': { owner: 'Omgili', category: 'Generic' },
    'omgili': { owner: 'Omgili', category: 'Generic' },
  };

  // --- THIS IS THE CORRECTED, ROBUST CSV PARSER ---
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

  const parseRobotsTxt = (content: string, country: string, outlet: string): AnalysisResult => {
    if (!content || content.trim() === '') {
      return { country, outlet, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [], hasSitemaps: false, hasCrawlDelay: false };
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
                // The '!' is safe here because of the `&& currentAgent` check above.
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

    return { country, outlet, robotsExists: true, blocksAI: aiBotsBlockedCount > 0, aiBotsBlockedCount, blockingStrategy, blockedBotsList: Array.from(blockedBots).sort(), hasSitemaps, hasCrawlDelay };
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
      const fetchResult = await fetchRobotsTxt(site['Robots.txt'] || '');
      const analysis = parseRobotsTxt(fetchResult.content, site['Country'] || '', site['Outlet'] || '');
      analysis.fetchUrl = fetchResult.url;
      analysisResults.push(analysis);
      setProgress(((i + 1) / sites.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
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
      percentageBlockingAI: (sitesBlockingAICount / total * 100).toFixed(1)
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          BotScanner
        </h1>
        <p className="text-lg text-gray-600">
          Analyze `robots.txt` files for AI web crawler blocking rules.
        </p>
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
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b">Overall Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><Globe className="text-blue-600" size={20} /><span className="font-medium text-blue-900">Total Outlets</span></div><p className="text-3xl font-bold text-blue-600">{summary.total}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><CheckCircle className="text-green-600" size={20} /><span className="font-medium text-green-900">Sites Blocking AI</span></div><p className="text-3xl font-bold text-green-600">{summary.sitesBlockingAICount}</p><p className="text-sm text-green-700">{summary.percentageBlockingAI}% of total</p></div>
                <div className="bg-amber-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><AlertCircle className="text-amber-600" size={20} /><span className="font-medium text-amber-900">No robots.txt</span></div><p className="text-3xl font-bold text-amber-600">{summary.sitesWithoutRobots}</p><p className="text-sm text-amber-700">{((summary.sitesWithoutRobots / summary.total) * 100).toFixed(1)}% of total</p></div>
                <div className="bg-purple-50 p-4 rounded-lg"><div className="flex items-center gap-2 mb-2"><BarChart3 className="text-purple-600" size={20} /><span className="font-medium text-purple-900">Avg. Bots Blocked</span></div><p className="text-3xl font-bold text-purple-600">{summary.averageBotsBlocked}</p><p className="text-sm text-purple-700">per blocking site</p></div>
            </div>
          </div>

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
            <h3 className="text-xl font-bold text-gray-900 mb-3">Top 10 Most Frequently Blocked Bots</h3>
            <div className="bg-white rounded-lg border">
              <ul className="divide-y divide-gray-200">
                {summary.topBlockedBots.map((bot: any, index: number) => (
                  <li key={index} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{bot.bot}</span>
                      <span className="text-sm text-gray-500 ml-2">({bot.owner})</span>
                    </div>
                    <div className="text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-4">
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
      )}
    </div>
  );
};

export default BotScannerPage;