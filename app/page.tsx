// PASTE THIS ENTIRE CODE BLOCK INTO: app/page.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Play, FileText, Zap, Globe, Link as LinkIcon, Shield, CheckCircle, BarChart3, Bot, Target, Download } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type SiteData = { [key: string]: string };
type AnalysisResult = {
  country: string; outlet: string; robotsExists: boolean; blocksAI: boolean; aiBotsBlockedCount: number; blockingStrategy: string;
  blockedBotsList: string[]; fetchUrl?: string; hasNoAIMetaTag: boolean; hasNoImageAIMetaTag: boolean;
  hasXRobotsNoAI: boolean; hasXRobotsNoImageAI: boolean; protectionScore: number; homepageUrl?: string; homepageChecked: boolean;
};

// --- MAIN COMPONENT ---
const BotScannerPage = () => {
  // --- STATE MANAGEMENT ---
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk');
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

  // --- DATA & CONFIGURATION ---
  const AI_BOTS: { [key: string]: string } = {
    'GPTBot': 'OpenAI', 'ChatGPT-User': 'OpenAI', 'Google-Extended': 'Google', 'anthropic-ai': 'Anthropic', 'ClaudeBot': 'Anthropic', 'Claude-Web': 'Anthropic',
    'PerplexityBot': 'Perplexity', 'YouBot': 'You.com', 'Bytespider': 'ByteDance', 'CCBot': 'Common Crawl', 'AhrefsBot': 'Ahrefs', 
    'Applebot': 'Apple', 'Applebot-Extended': 'Apple', 'Amazonbot': 'Amazon',
  };
  
  const strategyColors: { [key: string]: string } = {
    Extensive: 'bg-red-100 text-red-800', Comprehensive: 'bg-orange-100 text-orange-800',
    Moderate: 'bg-yellow-100 text-yellow-800', Basic: 'bg-blue-100 text-blue-800', None: 'bg-gray-100 text-gray-800',
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

  const fetchWithProxy = async (url: string, type: 'robots' | 'page') => {
    const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(url)}&type=${type}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const performFullAnalysis = async (site: SiteData): Promise<AnalysisResult | null> => {
    try {
      let domainUrl = site['Robots.txt'] || site['Outlet'] || '';
      if (!domainUrl.startsWith('http')) domainUrl = `https://${domainUrl}`;
      const urlObject = new URL(domainUrl);
      const baseUrl = `${urlObject.protocol}//${urlObject.hostname}`;

      let analysis: Partial<AnalysisResult> & { outlet: string; country: string } = {
          outlet: site['Outlet'] || urlObject.hostname, country: site['Country'] || 'N/A',
      };

      try {
        const robotsData = await fetchWithProxy(`${baseUrl}/robots.txt`, 'robots');
        analysis = { ...analysis, ...parseRobotsTxt(robotsData.content), fetchUrl: `${baseUrl}/robots.txt` };
      } catch {
        analysis = { ...analysis, robotsExists: false, blocksAI: false, aiBotsBlockedCount: 0, blockingStrategy: 'None', blockedBotsList: [] };
      }

      try {
        const pageData = await fetchWithProxy(baseUrl, 'page');
        analysis = { ...analysis, ...parseMetaAndHeaders(pageData), homepageUrl: baseUrl, homepageChecked: true };
      } catch {
        analysis = { ...analysis, hasNoAIMetaTag: false, hasNoImageAIMetaTag: false, hasXRobotsNoAI: false, hasXRobotsNoImageAI: false, homepageChecked: false };
      }

      analysis.protectionScore = calculateProtectionScore(analysis as Omit<AnalysisResult, 'protectionScore'>);
      return analysis as AnalysisResult;
    } catch(e) { console.error(`Analysis failed for ${site['Outlet']}`, e); return null; }
  };
  
  const analyzeAllSites = async () => {
    setAnalyzing(true); setProgress(0); setResults([]); setSummary(null); setCountryStats([]);
    const analysisResults: AnalysisResult[] = [];
    for (let i = 0; i < sites.length; i++) {
        const result = await performFullAnalysis(sites[i]);
        if(result) analysisResults.push(result);
        setProgress(((i + 1) / sites.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    setResults(analysisResults);
    generateSummaryAndStats(analysisResults);
    setAnalyzing(false);
  };
  
  const analyzeSingleDomain = async () => {
    if (!singleDomain.trim()) return;
    setAnalyzingSingle(true); setSingleResult(null);
    try {
        const result = await performFullAnalysis({ 'Outlet': singleDomain.trim(), 'Country': 'N/A', 'Robots.txt': singleDomain.trim() });
        setSingleResult(result);
    } catch (e) { console.error("Single analysis failed", e); }
    finally { setAnalyzingSingle(false); }
  };

  const parseRobotsTxt = (content: string) => {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blockedBots = new Set<string>(); let currentAgent: string | null = null;
    lines.forEach(line => {
        const trimmed = line.trim(); const lower = trimmed.toLowerCase();
        if (!trimmed || lower.startsWith('#')) return;
        if (lower.startsWith('user-agent:')) currentAgent = trimmed.substring(11).trim();
        else if (lower.startsWith('disallow:') && currentAgent && trimmed.substring(9).trim() === '/') {
            Object.keys(AI_BOTS).forEach(bot => { if (currentAgent === '*' || currentAgent!.toLowerCase() === bot.toLowerCase()) blockedBots.add(bot); });
        }
    });
    const count = blockedBots.size;
    let strategy = 'None';
    if (count > 10) strategy = 'Extensive'; else if (count > 5) strategy = 'Comprehensive';
    else if (count > 0) strategy = 'Basic';
    return { robotsExists: true, blocksAI: count > 0, aiBotsBlockedCount: count, blockingStrategy: strategy, blockedBotsList: Array.from(blockedBots).sort() };
  };

  const parseMetaAndHeaders = (pageData: { content: string, headers: Record<string, string>}) => {
    let hasNoAI = false, hasNoImageAI = false;
    const metaRegex = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/gi; let match;
    while((match = metaRegex.exec(pageData.content)) !== null) {
      const content = match[1].toLowerCase();
      if(content.includes('noai')) hasNoAI = true; if(content.includes('noimageai')) hasNoImageAI = true;
    }

    let hasXRobotsNoAI = false, hasXRobotsNoImageAI = false;
    const tag = pageData.headers['x-robots-tag'] || pageData.headers['X-Robots-Tag'];
    if(tag) { const lower = tag.toLowerCase(); if(lower.includes('noai')) hasXRobotsNoAI = true; if(lower.includes('noimageai')) hasXRobotsNoImageAI = true; }

    return { hasNoAIMetaTag: hasNoAI, hasNoImageAIMetaTag: hasNoImageAI, hasXRobotsNoAI, hasXRobotsNoImageAI };
  }
  
  const calculateProtectionScore = (a: Omit<AnalysisResult, 'protectionScore'>) => {
    let score = a.aiBotsBlockedCount * 0.5;
    if(a.hasNoAIMetaTag) score += 4; if(a.hasNoImageAIMetaTag) score += 2;
    if(a.hasXRobotsNoAI) score += 5; if(a.hasXRobotsNoImageAI) score += 3;
    if(a.blocksAI && (a.hasNoAIMetaTag || a.hasXRobotsNoAI)) score += 3;
    return Math.round(score);
  };

  const generateSummaryAndStats = (data: AnalysisResult[]) => {
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

    const countryData: Record<string, { total: number; hasRobots: number; blocksAI: number; strategies: Record<string, number> }> = {};
    data.forEach(d => {
        if (!d.country || d.country === 'N/A') return;
        if (!countryData[d.country]) countryData[d.country] = { total: 0, hasRobots: 0, blocksAI: 0, strategies: {} };
        const country = countryData[d.country];
        country.total++; if (d.robotsExists) country.hasRobots++; if (d.blocksAI) country.blocksAI++;
        country.strategies[d.blockingStrategy] = (country.strategies[d.blockingStrategy] || 0) + 1;
    });
    const stats = Object.entries(countryData).map(([country, d]) => ({
        country, total: d.total, hasRobots: d.hasRobots, blocksAI: d.blocksAI,
        robotsPercentage: (d.hasRobots/d.total*100).toFixed(1), aiBlockingPercentage: (d.blocksAI/d.total*100).toFixed(1),
        mostCommonStrategy: Object.keys(d.strategies).length ? Object.entries(d.strategies).sort((a,b)=>b[1]-a[1])[0][0] : 'None'
    })).sort((a,b) => b.blocksAI / b.total - a.blocksAI / a.total);
    setCountryStats(stats);
  };

  const downloadResults = () => {
    if (results.length === 0) return;

    const headers = [
      'Country', 'Outlet', 'Protection_Score', 'Blocks_AI_RobotsTxt', 'Robots.txt_Bots_Blocked',
      'Robots.txt_Strategy', 'Has_NoAI_Meta_Tag', 'Has_XRobots_NoAI_Header', 'Blocked_Bots_List', 'Robots_txt_URL'
    ];

    const formatField = (field: any) => {
      const str = String(field ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        formatField(r.country),
        formatField(r.outlet),
        formatField(r.protectionScore),
        formatField(r.blocksAI),
        formatField(r.aiBotsBlockedCount),
        formatField(r.blockingStrategy),
        formatField(r.hasNoAIMetaTag),
        formatField(r.hasXRobotsNoAI),
        formatField(r.blockedBotsList.join('; ')),
        formatField(r.fetchUrl)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'botscanner_analysis_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // --- RENDER FUNCTION ---
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-2">BotScanner</h1>
          <p className="text-xl text-gray-600">AI Web Crawler Protection Analysis</p>
        </header>

        <nav className="mb-10 flex justify-center">
            <div className="bg-gray-200/80 rounded-xl p-1.5 shadow-inner">
                <div className="flex gap-1">
                    {([['bulk', 'Bulk Analysis', FileText], ['single', 'Single Check', Zap]] as const).map(([id, text, Icon]) => (
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

        {/* --- Bulk Mode UI --- */}
        {mode === 'bulk' &&
          <section className="space-y-12">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/80">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-center flex-shrink-0">
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
                <div className="flex-1 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={analyzeAllSites} disabled={!sites.length || analyzing} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-green-500 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-md hover:bg-green-600 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100">
                      <Play size={24} /> {analyzing ? `Analyzing... ${Math.round(progress)}%` : 'Analyze All Sites'}
                  </button>
                  {results.length > 0 && !analyzing && (
                    <button onClick={downloadResults} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-500 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-md hover:bg-blue-600 transition-all duration-300 transform hover:scale-105">
                      <Download size={24} /> Download Results
                    </button>
                  )}
                </div>
              </div>
              {analyzing && <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>}
              
              {/* --- CSV FORMAT GUIDE --- */}
              <div className="mt-8 text-left text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">CSV Format Guide:</h4>
                <p>Your CSV file must contain a header row. The tool uses the following columns:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">Outlet</code>: The name of the website (e.g., The New York Times).</li>
                  <li><code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">Country</code>: The country of the outlet (e.g., USA).</li>
                  <li><code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">Robots.txt</code>: (Optional) A direct URL to the robots.txt file. If omitted, the tool will try <code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">https://[Outlet]/robots.txt</code>.</li>
                </ul>
                <p className="mt-3"><b>Example line:</b> <code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded">"The Example Times","USA","https://www.example.com/robots.txt"</code></p>
              </div>
            </div>
            
            {summary && (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { icon: Globe, label: 'Total Outlets', value: summary.total, color: 'blue' },
                      { icon: FileText, label: 'Has robots.txt', value: summary.sitesWithRobots, sub: `${summary.percentageWithRobots}%`, color: 'green' },
                      { icon: Shield, label: 'Blocks AI', value: summary.sitesBlockingAI, sub: `${summary.percentageBlockingAI}%`, color: 'red' },
                      { icon: Zap, label: 'Most Common', value: summary.mostCommonStrategy, color: 'purple' },
                    ].map(s => (
                      <div key={s.label} className={`bg-${s.color}-50 border-l-4 border-${s.color}-500 p-5 rounded-r-lg`}>
                        <div className={`flex items-center gap-2 mb-1 text-sm font-semibold text-${s.color}-800`}><s.icon className="w-5 h-5" />{s.label}</div>
                        <p className={`text-4xl font-bold text-${s.color}-900`}>{s.value}</p>
                        {s.sub && <p className={`text-sm text-${s.color}-700`}>{s.sub}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Most Frequently Blocked AI Bots</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-8 gap-y-6">
                    {summary.topBlockedBots.map((b:any) => ( <div key={b.bot}><p className="font-semibold text-gray-800">{b.bot}</p><p className="text-gray-600">{b.count} sites ({(b.count / summary.total * 100).toFixed(1)}%)</p></div> ))}
                  </div>
                </div>
                
                {countryStats.length > 0 &&
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                    <h2 className="text-2xl font-bold text-gray-900 p-6">Analysis by Country</h2>
                    <div className="overflow-x-auto"><table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr>{['Country', 'Total Outlets', 'Has Robots.txt', 'Blocks AI (%)', 'Most Common Strategy'].map(h => <th key={h} className="px-6 py-4 text-left font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-200">{countryStats.map((s) => (<tr key={s.country} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2"><Globe size={16} className="text-gray-400"/>{s.country}</td><td className="px-6 py-4">{s.total}</td><td className="px-6 py-4">{s.hasRobots} ({s.robotsPercentage}%)</td><td className="px-6 py-4"><div className="flex items-center gap-3"><span>{s.blocksAI} ({s.aiBlockingPercentage}%)</span><div className="w-24 bg-gray-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{width: `${s.aiBlockingPercentage}%`}}></div></div></div></td><td className="px-6 py-4">{s.mostCommonStrategy}</td></tr>))}</tbody>
                    </table></div>
                  </div>
                }
                
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                  <h2 className="text-2xl font-bold text-gray-900 p-6">Detailed Results by Outlet</h2>
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>{['Country', 'Outlet', 'Robots.txt', 'Blocks AI', 'Strategy', 'Bot Count', 'Blocked Bots'].map(h => <th key={h} className="px-6 py-4 text-left font-bold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200">{results.map((r, i) => (<tr key={i} className="hover:bg-gray-50"><td className="px-6 py-4">{r.country}</td><td className="px-6 py-4 font-medium">{r.outlet}</td><td className="px-6 py-4">{r.robotsExists ? <a href={r.fetchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><LinkIcon size={14}/>Yes</a> : <span>No</span>}</td><td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${r.blocksAI ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{r.blocksAI ? 'Yes' : 'No'}</span></td><td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${strategyColors[r.blockingStrategy]}`}>{r.blockingStrategy}</span></td><td className="px-6 py-4 text-center">{r.aiBotsBlockedCount}</td><td className="px-6 py-4 max-w-xs truncate">{r.blockedBotsList.length > 0 ? r.blockedBotsList.slice(0,3).join(', ') + (r.blockedBotsList.length > 3 ? '...' : '') : '-'}</td></tr>))}</tbody>
                  </table></div>
                </div>
              </>
            )}
          </section>
        }

        {/* --- Single Site Mode UI --- */}
        {mode === 'single' &&
          <section className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/80">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Quick Check Single Domain</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g., example.com" value={singleDomain} onChange={(e) => setSingleDomain(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && analyzeSingleDomain()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus-visible:outline-none"/>
                <button onClick={analyzeSingleDomain} disabled={!singleDomain.trim() || analyzingSingle}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100">
                    {analyzingSingle ? '...' : 'Scan'}
                </button>
              </div>
            </div>
            {analyzingSingle && <div className="text-center text-blue-600 font-semibold">Analyzing...</div>}
            {singleResult && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b">
                  <h3 className="text-xl font-bold text-gray-800">Results for: <span className="text-blue-600">{singleResult.outlet}</span></h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-lg mb-2">Robots.txt Analysis</h4>
                    <p>File Found: <span className={`font-semibold ${singleResult.robotsExists ? 'text-green-600' : 'text-red-600'}`}>{singleResult.robotsExists ? 'Yes' : 'No'}</span></p>
                    <p>Blocks AI Crawlers: <span className={`font-semibold ${singleResult.blocksAI ? 'text-red-600' : 'text-green-600'}`}>{singleResult.blocksAI ? 'Yes' : 'No'}</span></p>
                    <p>Bots Blocked: <span className="font-semibold">{singleResult.aiBotsBlockedCount}</span></p>
                    <p>Strategy: <span className={`font-semibold`}>{singleResult.blockingStrategy}</span></p>
                    {singleResult.fetchUrl && <a href={singleResult.fetchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-2"><LinkIcon size={14}/>View robots.txt</a>}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Blocked Bots</h4>
                    {singleResult.blockedBotsList.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {singleResult.blockedBotsList.map(bot => <span key={bot} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">{bot}</span>)}
                      </div>
                    ) : <p className="text-gray-500">None</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        }

        {/* --- SUBSCRIBE SECTION --- */}
        <section className="mt-16 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/80 inline-block max-w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated</h2>
            <p className="text-gray-600 mb-6">Subscribe for the latest analysis and tool updates.</p>
            <iframe 
              src="https://newstechnavigator.substack.com/embed" 
              width="480" 
              height="320" 
              style={{ border: '1px solid #EEE', background: 'white', maxWidth: '100%' }}
              frameBorder="0" 
              scrolling="no">
            </iframe>
          </div>
        </section>

        {/* --- FOOTER WITH DISCLAIMER --- */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Analysis is for informational purposes only, based on data at the time of the scan. Accuracy is not guaranteed.
          </p>
        </footer>

      </div>
    </div>
  );
};

export default BotScannerPage;