// This is the full content for app/page.tsx

'use client'; // <-- THIS LINE IS NEW AND VERY IMPORTANT

import React, { useState, useCallback } from 'react';
import { Upload, Download, Play, BarChart3, AlertCircle, CheckCircle, Globe, Building, Eye, Search, Link } from 'lucide-react';

const RobotsTxtAnalyzer = () => {
  // ... Paste the entire RobotsTxtAnalyzer component code here ...
  // (The rest of the component code is exactly the same as before)
  const [file, setFile] = useState(null);
  const [sites, setSites] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [countryStats, setCountryStats] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [corsWarning, setCorsWarning] = useState(false);

  // Known AI bots to detect
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

  const parseCSVLine = (line) => {
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

  const handleFileUpload = useCallback((event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      console.log('CSV file loaded, total length:', text.length);
      
      const lines = text.split(/\r?\n/);
      console.log('Total lines in CSV:', lines.length);
      
      const headers = parseCSVLine(lines[0]);
      console.log('CSV Headers found:', headers);
      
      const parsedData = [];
      let successfullyParsed = 0;
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          try {
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            if (i <= 3) {
              console.log(`Row ${i} parsed:`, {
                country: row['Country'],
                outlet: row['Outlet'], 
                robotsUrl: row['Robots.txt']
              });
            }
            
            parsedData.push(row);
            successfullyParsed++;
          } catch (error) {
            console.warn(`Error parsing line ${i}:`, error);
          }
        }
      }
      
      console.log(`Successfully parsed ${successfullyParsed} rows`);
      setSites(parsedData);
    };
    
    reader.readAsText(uploadedFile);
  }, []);

  const fetchRobotsTxt = async (url) => {
    if (!url || url.trim() === '') {
      return { content: '', status: 'No URL provided', error: true };
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    const urlObject = new URL(cleanUrl);
    const robotsUrl = `${urlObject.protocol}//${urlObject.hostname}/robots.txt`;

    console.log(`Proxying fetch for robots.txt from: ${robotsUrl}`);
    setCorsWarning(false);

    try {
      const proxyUrl = `/api/fetch-robots?url=${encodeURIComponent(robotsUrl)}`;
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully fetched ${content.length} characters from ${robotsUrl}`);
        return { content, status: 'Success', error: false, url: robotsUrl };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown proxy error' }));
        const statusText = errorData.error || response.statusText;
        console.warn(`Proxy returned HTTP ${response.status} for ${robotsUrl}: ${statusText}`);
        return { content: '', status: `HTTP ${response.status} - ${statusText}`, error: true, url: robotsUrl };
      }
    } catch (error) {
      console.error(`Fetch error for ${robotsUrl} via proxy:`, error);
      return { content: '', status: 'Network error communicating with proxy', error: true, url: robotsUrl };
    }
  };

  const parseRobotsTxt = (content, country, outlet, fetchResult) => {
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
      return {
        country,
        outlet,
        robotsExists: false,
        blocksAI: false,
        aiBotsBlockedCount: 0,
        blockingStrategy: 'None',
        blockedBotsList: [],
        hasSitemaps: false,
        sitemapCount: 0,
        blocksDiscussions: false,
        blocksArchives: false,
        blocksPremium: false,
        hasCrawlDelay: false,
        totalBlockedAgents: 0,
        hasWildcards: false,
        debug
      };
    }

    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    
    const blockedBots = new Set();
    const allBlockedAgents = new Set();
    const userAgents = new Set();
    const disallowRules = [];
    let hasSitemaps = false;
    let sitemapCount = 0;
    let blocksDiscussions = false;
    let blocksArchives = false;
    let blocksPremium = false;
    let hasCrawlDelay = false;
    let hasWildcards = false;
    
    let currentAgent = null;
    let agentDisallowPairs = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      if (trimmedLine.toLowerCase().startsWith('sitemap:')) {
        hasSitemaps = true;
        sitemapCount++;
        debug.hasDisallow = true;
        continue;
      }
      
      if (trimmedLine.toLowerCase().startsWith('crawl-delay:')) {
        hasCrawlDelay = true;
        continue;
      }
      
      if (trimmedLine.toLowerCase().startsWith('user-agent:')) {
        const agentPart = trimmedLine.substring(11).trim();
        currentAgent = agentPart;
        userAgents.add(currentAgent);
        debug.hasUserAgent = true;
        
        if (currentAgent === '*') {
          hasWildcards = true;
        }
        continue;
      }
      
      if (trimmedLine.toLowerCase().startsWith('disallow:') && currentAgent) {
        const disallowPart = trimmedLine.substring(9).trim();
        const disallowPath = disallowPart;
        
        disallowRules.push({ agent: currentAgent, path: disallowPath });
        debug.hasDisallow = true;
        agentDisallowPairs.push(`${currentAgent} -> ${disallowPath}`);
        
        if (disallowPath === '/') {
          allBlockedAgents.add(currentAgent.toLowerCase());
          
          Object.keys(AI_BOTS).forEach(bot => {
            const botLower = bot.toLowerCase();
            const agentLower = currentAgent.toLowerCase();
            
            if (agentLower === botLower || 
                agentLower.includes(botLower) || 
                botLower.includes(agentLower)) {
              blockedBots.add(bot);
              debug.blockedBots.push(`${bot} (matched with ${currentAgent})`);
            }
          });
        }
        
        const pathLower = disallowPath.toLowerCase();
        if (['diskuse', 'comment', 'discussion', 'reakce', 'vlakno'].some(term => pathLower.includes(term))) {
          blocksDiscussions = true;
        }
        if (['archive', 'archiv', 'archiva'].some(term => pathLower.includes(term))) {
          blocksArchives = true;
        }
        if (['premium', 'subscription', 'paywall', 'paid'].some(term => pathLower.includes(term))) {
          blocksPremium = true;
        }
      }
    }

    debug.userAgents = Array.from(userAgents).slice(0, 10);
    debug.disallowRules = agentDisallowPairs.slice(0, 10);

    const aiBotsBlockedCount = blockedBots.size;
    let blockingStrategy = 'None';
    if (aiBotsBlockedCount > 20) blockingStrategy = 'Extensive';
    else if (aiBotsBlockedCount > 10) blockingStrategy = 'Comprehensive';
    else if (aiBotsBlockedCount > 3) blockingStrategy = 'Moderate';
    else if (aiBotsBlockedCount > 0) blockingStrategy = 'Basic';

    return {
      country,
      outlet,
      robotsExists: true,
      blocksAI: aiBotsBlockedCount > 0,
      aiBotsBlockedCount,
      blockingStrategy,
      blockedBotsList: Array.from(blockedBots).sort(),
      hasSitemaps,
      sitemapCount,
      blocksDiscussions,
      blocksArchives,
      blocksPremium,
      hasCrawlDelay,
      totalBlockedAgents: allBlockedAgents.size,
      hasWildcards,
      debug
    };
  };

  const runValidation = async () => {
    if (!sites.length) return;
    
    console.log('=== STARTING VALIDATION ===');
    console.log('Total sites loaded:', sites.length);
    
    const validation = [];
    const sampleSize = Math.min(5, sites.length);
    
    setShowValidation(true);
    setValidationResults([]);
    
    for (let i = 0; i < sampleSize; i++) {
      const site = sites[i];
      const country = site['Country'] || '';
      const outlet = site['Outlet'] || '';
      const robotsUrl = site['Robots.txt'] || '';
      
      console.log(`\n--- Fetching & Validating Site ${i + 1}: ${outlet} ---`);
      console.log('Robots.txt URL:', robotsUrl);
      
      const fetchResult = await fetchRobotsTxt(robotsUrl);
      const analysis = parseRobotsTxt(fetchResult.content, country, outlet, fetchResult);
      
      analysis.fetchUrl = fetchResult.url;
      validation.push(analysis);
      setValidationResults([...validation]);
      
      console.log('Analysis result:', {
        outlet: analysis.outlet,
        fetchStatus: fetchResult.status,
        contentLength: fetchResult.content.length,
        robotsExists: analysis.robotsExists,
        blocksAI: analysis.blocksAI,
        aiBotsBlockedCount: analysis.aiBotsBlockedCount,
        blockedBots: analysis.blockedBotsList
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('=== VALIDATION COMPLETE ===');
  };

  const analyzeAllSites = async () => {
    if (!sites.length) return;
    
    setAnalyzing(true);
    setProgress(0);
    setCorsWarning(false);
    const newResults = [];
    
    console.log('=== STARTING FULL ANALYSIS ===');
    console.log('Total sites to analyze:', sites.length);
    
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
      } catch (error) {
        console.error(`Error processing ${outlet}:`, error);
        newResults.push({
          country,
          outlet,
          robotsExists: false,
          blocksAI: false,
          aiBotsBlockedCount: 0,
          blockingStrategy: 'None',
          blockedBotsList: [],
          hasSitemaps: false,
          sitemapCount: 0,
          blocksDiscussions: false,
          blocksArchives: false,
          blocksPremium: false,
          hasCrawlDelay: false,
          totalBlockedAgents: 0,
          hasWildcards: false,
          debug: { parsingErrors: ['Processing error'] }
        });
      }
      
      setProgress(((i + 1) / sites.length) * 100);
      
      if (i % 10 === 0) {
        console.log(`Progress: ${i + 1}/${sites.length} sites`);
      }
      
      // Delay to be respectful to servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const totalBlocking = newResults.filter(r => r.blocksAI).length;
    const totalWithRobots = newResults.filter(r => r.robotsExists).length;
    
    console.log('=== ANALYSIS COMPLETE ===');
    console.log(`Total sites: ${newResults.length}`);
    console.log(`Sites with robots.txt: ${totalWithRobots}`);
    console.log(`Sites blocking AI: ${totalBlocking}`);
    
    setResults(newResults);
    generateSummary(newResults);
    generateCountryStats(newResults);
    setAnalyzing(false);
  };

  const generateSummary = (data) => {
    const total = data.length;
    const hasRobots = data.filter(d => d.robotsExists).length;
    const blocksAI = data.filter(d => d.blocksAI).length;
    
    const strategies = data.reduce((acc, d) => {
      acc[d.blockingStrategy] = (acc[d.blockingStrategy] || 0) + 1;
      return acc;
    }, {});

    const botCounts = {};
    data.forEach(d => {
      d.blockedBotsList.forEach(bot => {
        botCounts[bot] = (botCounts[bot] || 0) + 1;
      });
    });

    const topBlockedBots = Object.entries(botCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([bot, count]) => ({ bot, count, percentage: (count / total * 100).toFixed(1) }));

    setSummary({
      total,
      hasRobots,
      blocksAI,
      strategies,
      topBlockedBots,
      percentageWithRobots: (hasRobots / total * 100).toFixed(1),
      percentageBlockingAI: (blocksAI / total * 100).toFixed(1)
    });
  };

  const generateCountryStats = (data) => {
    const countryData = {};
    
    data.forEach(d => {
      if (!countryData[d.country]) {
        countryData[d.country] = { total: 0, hasRobots: 0, blocksAI: 0, strategies: {} };
      }
      
      countryData[d.country].total++;
      if (d.robotsExists) countryData[d.country].hasRobots++;
      if (d.blocksAI) countryData[d.country].blocksAI++;
      
      const strategy = d.blockingStrategy;
      countryData[d.country].strategies[strategy] = (countryData[d.country].strategies[strategy] || 0) + 1;
    });

    const countryStats = Object.entries(countryData).map(([country, stats]) => ({
      country,
      total: stats.total,
      hasRobots: stats.hasRobots,
      blocksAI: stats.blocksAI,
      robotsPercentage: (stats.hasRobots / stats.total * 100).toFixed(1),
      aiBlockingPercentage: (stats.blocksAI / stats.total * 100).toFixed(1),
      mostCommonStrategy: Object.entries(stats.strategies).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    })).sort((a, b) => b.aiBlockingPercentage - a.aiBlockingPercentage);

    setCountryStats(countryStats);
  };

  const downloadResults = () => {
    if (!results.length) return;
    
    const headers = [
      'Country', 'Outlet', 'Robots_URL', 'Robots_Exists', 'Blocks_AI', 'AI_Bots_Blocked_Count',
      'Blocking_Strategy', 'Blocked_Bots_List', 'Has_Sitemaps', 'Sitemap_Count',
      'Blocks_Discussions', 'Blocks_Archives', 'Blocks_Premium', 'Has_Crawl_Delay',
      'Total_Blocked_Agents', 'Has_Wildcards', 'Fetch_Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...results.map(row => [
        `"${row.country}"`,
        `"${row.outlet}"`,
        `"${row.fetchUrl || ''}"`,
        row.robotsExists,
        row.blocksAI,
        row.aiBotsBlockedCount,
        row.blockingStrategy,
        `"${row.blockedBotsList.join('; ')}"`,
        row.hasSitemaps,
        row.sitemapCount,
        row.blocksDiscussions,
        row.blocksArchives,
        row.blocksPremium,
        row.hasCrawlDelay,
        row.totalBlockedAgents,
        row.hasWildcards,
        `"${row.debug?.fetchStatus || row.debug?.parsingErrors?.[0] || 'Unknown'}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'european_news_ai_blocking_analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
            onClick={runValidation}
            disabled={analyzing}
            className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
          >
            <Search size={20} />
            Test Fetch & Parse (5 sites)
          </button>
          
          <button
            onClick={analyzeAllSites}
            disabled={analyzing}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            <Play size={20} />
            {analyzing ? 'Analyzing...' : 'Fetch & Analyze All Sites'}
          </button>
          
          {results.length > 0 && (
            <button
              onClick={downloadResults}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={20} />
              Download Results
            </button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {analyzing && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Fetching & Analyzing Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {showValidation && validationResults.length > 0 && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center gap-2">
            <Eye size={20} />
            Validation Results ({validationResults.length} sites tested)
          </h3>
          <div className="space-y-4">
            {validationResults.map((result, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{result.outlet} ({result.country})</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Link size={14} />
                      {result.fetchUrl}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    result.blocksAI ? 'bg-red-100 text-red-800' : 
                    result.robotsExists ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {result.blocksAI ? `Blocks ${result.aiBotsBlockedCount} AI bots` : 
                     result.robotsExists ? 'Has robots.txt' : 'No robots.txt'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Fetch Status:</strong> {result.debug?.fetchStatus || 'Unknown'}<br/>
                    <strong>Content Length:</strong> {result.debug?.contentLength || 0} chars<br/>
                    <strong>Has User-Agent:</strong> {result.debug?.hasUserAgent ? 'Yes' : 'No'}<br/>
                    <strong>Has Disallow:</strong> {result.debug?.hasDisallow ? 'Yes' : 'No'}<br/>
                    <strong>Strategy:</strong> {result.blockingStrategy}
                  </div>
                  <div>
                    <strong>User Agents Found:</strong> {result.debug?.userAgents?.slice(0, 3).join(', ') || 'None'}
                    {result.debug?.userAgents?.length > 3 && '...'}<br/>
                    <strong>Blocked Bots:</strong> {result.blockedBotsList.slice(0, 3).join(', ')}
                    {result.blockedBotsList.length > 3 && '...'}<br/>
                    <strong>Errors:</strong> {result.debug?.parsingErrors?.join(', ') || 'None'}
                  </div>
                </div>
                {result.debug?.originalContent && (
                  <div className="mt-3">
                    <strong className="text-sm">Content Preview:</strong>
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 max-h-20 overflow-y-auto">
                      {result.debug.originalContent}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="text-blue-600" size={20} />
                <span className="font-medium text-blue-900">Total Outlets</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-600" size={20} />
                <span className="font-medium text-green-900">Has robots.txt</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.hasRobots}</p>
              <p className="text-sm text-green-700">{summary.percentageWithRobots}%</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-red-600" size={20} />
                <span className="font-medium text-red-900">Blocks AI</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.blocksAI}</p>
              <p className="text-sm text-red-700">{summary.percentageBlockingAI}%</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="text-purple-600" size={20} />
                <span className="font-medium text-purple-900">Most Common</span>
              </div>
              <p className="text-lg font-bold text-purple-600">
                {Object.entries(summary.strategies).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
              </p>
            </div>
          </div>

          {/* Top Blocked Bots */}
          {summary.topBlockedBots.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Most Frequently Blocked AI Bots</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {summary.topBlockedBots.slice(0, 10).map((bot, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{bot.bot}</span>
                    <div className="text-gray-600">{bot.count} sites ({bot.percentage}%)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Country Analysis */}
      {countryStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis by Country</h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Country</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Total Outlets</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Has Robots.txt</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocks AI (%)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Most Common Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {countryStats.map((stat, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Globe size={16} className="text-gray-400" />
                        {stat.country}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{stat.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{stat.hasRobots} ({stat.robotsPercentage}%)</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{stat.blocksAI} ({stat.aiBlockingPercentage}%)</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, stat.aiBlockingPercentage)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{stat.mostCommonStrategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-lg font-medium text-gray-900">Detailed Results by Outlet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Country</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Outlet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Robots.txt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocks AI</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Strategy</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Bot Count</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Blocked Bots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.slice(0, 100).map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{result.country}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Building size={16} className="text-gray-400" />
                      {result.outlet}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        result.robotsExists 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.robotsExists ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        result.blocksAI 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {result.blocksAI ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        result.blockingStrategy === 'Extensive' ? 'bg-red-100 text-red-800' :
                        result.blockingStrategy === 'Comprehensive' ? 'bg-orange-100 text-orange-800' :
                        result.blockingStrategy === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                        result.blockingStrategy === 'Basic' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.blockingStrategy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{result.aiBotsBlockedCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {result.blockedBotsList.length > 0 ? result.blockedBotsList.slice(0, 3).join(', ') + (result.blockedBotsList.length > 3 ? '...' : '') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 100 && (
            <div className="p-4 text-center text-gray-600 bg-gray-50">
              Showing first 100 results. Download CSV for complete data.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  return <RobotsTxtAnalyzer />;
}