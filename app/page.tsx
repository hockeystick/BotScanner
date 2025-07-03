// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Play, BarChart3, AlertCircle, CheckCircle, Globe, Link as LinkIcon, ChevronUp, ChevronDown, Search, Shield, Bot, Target, Zap, FileText } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type SiteData = { [key: string]: string };
type FetchResult = { content: string; status: string; error: boolean; url: string };
type PageFetchResult = { content:string; headers: Record<string, string>; url: string };
type AnalysisResult = {
  country: string; outlet: string; robotsExists: boolean; blocksAI: boolean; aiBotsBlockedCount: number; blockingStrategy: string;
  blockedBotsList: string[]; hasSitemaps: boolean; hasCrawlDelay: boolean; fetchUrl?: string; hasNoAIMetaTag: boolean;
  hasNoImageAIMetaTag: boolean; hasXRobotsNoAI: boolean; hasXRobotsNoImageAI: boolean; protectionScore: number; 
  homepageUrl?: string; homepageChecked: boolean;
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
  const [countryStats, setCountryStats] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('outlet');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // --- DATA & CONFIGURATION ---
  const AI_BOTS: { [key: string]: { owner: string; category: string } } = {
    'GPTBot': { owner: 'OpenAI', category: 'Major AI' }, 'ChatGPT-User': { owner: 'OpenAI', category: 'Major AI' }, 'Google-Extended': { owner: 'Google', category: 'Major AI' }, 'anthropic-ai': { owner: 'Anthropic', category: 'Major AI' }, 'ClaudeBot': { owner: 'Anthropic', category: 'Major AI' }, 'Claude-Web': { owner: 'Anthropic', category: 'Major AI' },
    'PerplexityBot': { owner: 'Perplexity', category: 'Search' }, 'YouBot': { owner: 'You.com', category: 'Search' },
    'Bytespider': { owner: 'ByteDance', category: 'Web Crawler' }, 'CCBot': { owner: 'Common Crawl', category: 'Web Crawler' }, 'AhrefsBot': { owner: 'Ahrefs', category: 'SEO' }, 'Applebot': { owner: 'Apple', category: 'Web Crawler' }, 'Applebot-Extended': { owner: 'Apple', category: 'Web Crawler' }, 'Amazonbot': { owner: 'Amazon', category: 'Web Crawler' },
  };
  
  const strategyColors: { [key: string]: string } = {
    Extensive: 'bg-red-100 text-red-800',
    Comprehensive: 'bg-orange-100 text-orange-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    Basic: 'bg-blue-100 text-blue-800',
    None: 'bg-gray-100 text-gray-800',
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
        } catch { return null; }
      }).filter(Boolean);
      setSites(data as SiteData[]);
    };
    reader.readAsText(file);
  }, []);

  const fetchWithProxy = async (url: string, type: 'robots' | 'page'): Promise<any> => {
    const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(url)}&type=${type}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  };
  
  const analyzeAllSites = async () => {
    setAnalyzing(true); setProgress(0); setResults([]); setSummary(null); setCountryStats([]);
    const analysisResults: AnalysisResult[] = [];
    for (let i = 0; i < sites.length; i++) {
        const result = await performFullAnalysis(sites[i]);
        if(result) analysisResults.push(result);
        setProgress(((i + 1) / sites.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    setResults(analysisResults);
    generateSummary(analysisResults);
    generateCountryStats(analysisResults);
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

      try {
        const robotsData = await fetchWithProxy(`${baseUrl}/robots.txt`, 'robots');
        analysis = { ...analysis, ...parseRobotsTxt(robotsData.content), fetchUrl: `${baseUrl}/robots.txt` };
      } catch {
        analysis = { ...analysis, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [], hasSitemaps: false, hasCrawlDelay: false };
      }
      return analysis as AnalysisResult;
    } catch { return null; }
  };

  const parseRobotsTxt = (content: string) => {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blockedBots = new Set<string>(); let currentAgent: string | null = null;
    lines.forEach(line => {
        const trimmed = line.trim(); const lower = trimmed.toLowerCase();
        if (!trimmed || lower.startsWith('#')) return;
        if (lower.startsWith('user-agent:')) currentAgent = trimmed.substring(11).trim();
        else if (lower.startsWith('disallow:') && currentAgent) {
            if (trimmed.substring(9).trim() === '/') {
                Object.keys(AI_BOTS).forEach(bot => { if (currentAgent === '*' || currentAgent!.toLowerCase() === bot.toLowerCase()) blockedBots.add(bot); });
            }
        }
    });
    const count = blockedBots.size;
    let strategy = 'None';
    if (count > 10) strategy = 'Extensive';
    else if (count > 5) strategy = 'Comprehensive';
    else if (count > 0) strategy = 'Basic';
    return { robotsExists: true, blocksAI: count > 0, aiBotsBlockedCount: count, blockingStrategy: strategy, blockedBotsList: Array.from(blockedBots).sort() };
  };

  const generateSummary = (data: AnalysisResult[]) => {
    const total = data.length; if (total === 0) return;
    const sitesWithRobots = data.filter(d => d.robotsExists).length;
    const sitesBlockingAI = data.filter(d => d.blocksAI).length;
    const botCounts: { [key: string]: number } = {};
    data.forEach(d => d.blockedBotsList.forEach(bot => botCounts[bot] = (botCounts[bot] || 0) + 1));
    const topBlockedBots = Object.entries(botCounts).sort((a,b) => b[1]-a[1]).slice(0,10).map(([bot, count]) => ({bot, count}));
    const strategyCounts = data.reduce((acc, d) => ({...acc, [d.blockingStrategy]: (acc[d.blockingStrategy] || 0) + 1 }), {} as Record<string, number>);
    const mostCommonStrategy = Object.keys(strategyCounts).length ? Object.entries(strategyCounts).sort((a,b)=>b[1]-a[1])[0][0] : 'None';
    
    setSummary({
      total, sitesWithRobots, sitesBlockingAI, topBlockedBots, mostCommonStrategy,
      percentageWithRobots: (sitesWithRobots/total*100).toFixed(1),
      percentageBlockingAI: (sitesBlockingAI/total*100).toFixed(1)
    });
  };

  const generateCountryStats = (data: AnalysisResult[]) => {
    const countryData: Record<string, { total: number; hasRobots: number; blocksAI: number; strategies: Record<string, number> }> = {};
    data.forEach(d => {
        if (!countryData[d.country]) countryData[d.country] = { total: 0, hasRobots: 0, blocksAI: 0, strategies: {} };
        const country = countryData[d.country];
        country.total++;
        if (d.robotsExists) country.hasRobots++;
        if (d.blocksAI) country.blocksAI++;
        country.strategies[d.blockingStrategy] = (country.strategies[d.blockingStrategy] || 0) + 1;
    });
    const stats = Object.entries(countryData).map(([country, d]) => ({
        country,
        total: d.total,
        hasRobots: d.hasRobots,
        blocksAI: d.blocksAI,
        robotsPercentage: (d.hasRobots/d.total*100).toFixed(1),
        aiBlockingPercentage: (d.blocksAI/d.total*100).toFixed(1),
        mostCommonStrategy: Object.keys(d.strategies).length ? Object.entries(d.strategies).sort((a,b)=>b[1]-a[1])[0][0] : 'None'
    })).sort((a,b) => b.blocksAI - a.blocksAI);
    setCountryStats(stats);
  };
  
  // --- RENDER FUNCTION ---
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-2">BotScanner</h1>
          <p className="text-xl text-gray-600">AI Web Crawler Protection Analysis</p>
        </header>

        <section className="mb-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-200/80">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <Upload className="mx-auto text-blue-500 mb-4" size={48} />
              <label className="cursor-pointer">
                <span className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">
                  Upload CSV File
                </span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {file && <div className="mt-4 text-green-700 font-medium">✅ {file.name} ({sites.length} sites loaded)</div>}
            </div>
            <div className="w-full md:w-px h-px md:h-24 bg-gray-200"></div>
            <div className="flex-1 text-center">
              <button onClick={analyzeAllSites} disabled={!sites.length || analyzing} className="w-full md:w-auto flex items-center justify-center gap-3 bg-green-500 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-md hover:bg-green-600 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100">
                  <Play size={24} /> {analyzing ? `Analyzing... ${Math.round(progress)}%` : 'Analyze All Sites'}
              </button>
              {analyzing && <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>}
            </div>
          </div>
        </section>
        
        {summary && (
          <section className="space-y-12">
            {/* Overall Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: Globe, label: 'Total Outlets', value: summary.total, color: 'blue' },
                  { icon: FileText, label: 'Has robots.txt', value: summary.sitesWithRobots, sub: `${summary.percentageWithRobots}%`, color: 'green' },
                  { icon: Shield, label: 'Blocks AI', value: summary.sitesBlockingAI, sub: `${summary.percentageBlockingAI}%`, color: 'red' },
                  { icon: Zap, label: 'Most Common Strategy', value: summary.mostCommonStrategy, color: 'purple' },
                ].map(s => (
                  <div key={s.label} className={`bg-${s.color}-50 border-l-4 border-${s.color}-500 p-5 rounded-r-lg`}>
                    <div className={`flex items-center gap-2 mb-1 text-sm font-semibold text-${s.color}-800`}><s.icon className="w-5 h-5" />{s.label}</div>
                    <p className={`text-4xl font-bold text-${s.color}-900`}>{s.value}</p>
                    {s.sub && <p className={`text-sm text-${s.color}-700`}>{s.sub}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Most Blocked Bots */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Most Frequently Blocked AI Bots</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-8 gap-y-6">
                {summary.topBlockedBots.map((b:any) => (
                  <div key={b.bot}>
                    <p className="font-semibold text-gray-800">{b.bot}</p>
                    <p className="text-gray-600">{b.count} sites ({(b.count / summary.total * 100).toFixed(1)}%)</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis by Country */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-0 p-6">Analysis by Country</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    {['Country', 'Total Outlets', 'Has Robots.txt', 'Blocks AI (%)', 'Most Common Strategy'].map(h => <th key={h} className="px-6 py-4 text-left font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {countryStats.map((s) => (
                      <tr key={s.country} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2"><Globe size={16} className="text-gray-400"/>{s.country}</td>
                        <td className="px-6 py-4 text-gray-700">{s.total}</td>
                        <td className="px-6 py-4 text-gray-700">{s.hasRobots} ({s.robotsPercentage}%)</td>
                        <td className="px-6 py-4 text-gray-700">
                          <div className="flex items-center gap-3">
                            <span>{s.blocksAI} ({s.aiBlockingPercentage}%)</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{width: `${s.aiBlockingPercentage}%`}}></div></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{s.mostCommonStrategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Results by Outlet */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                <h2 className="text-2xl font-bold text-gray-900 mb-0 p-6">Detailed Results by Outlet</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr>
                            {['Country', 'Outlet', 'Robots.txt', 'Blocks AI', 'Strategy', 'Bot Count', 'Blocked Bots'].map(h => <th key={h} className="px-6 py-4 text-left font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-200">
                            {results.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-700">{r.country}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{r.outlet}</td>
                                    <td className="px-6 py-4">{r.robotsExists ? <a href={r.fetchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><LinkIcon size={14}/>Yes</a> : <span>No</span>}</td>
                                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${r.blocksAI ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{r.blocksAI ? 'Yes' : 'No'}</span></td>
                                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${strategyColors[r.blockingStrategy]}`}>{r.blockingStrategy}</span></td>
                                    <td className="px-6 py-4 text-center text-gray-800 font-medium">{r.aiBotsBlockedCount}</td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{r.blockedBotsList.length > 0 ? r.blockedBotsList.slice(0,3).join(', ') + (r.blockedBotsList.length > 3 ? '...' : '') : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BotScannerPage;