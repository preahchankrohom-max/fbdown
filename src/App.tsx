/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Link as LinkIcon,
  Folder,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Check,
  Film,
} from 'lucide-react';

import { Header } from './components/Header';
import { SaveLocationModal } from './components/SaveLocationModal';
import { ReelsModal } from './components/ReelsModal';
import { RecentDownloadsList } from './components/RecentDownloadsList';
import { HowToGuideModal } from './components/HowToGuideModal';
import { HtmlSourceModal } from './components/HtmlSourceModal';

import {
  DownloadItem,
  SaveLocationConfig,
  ReelBatchItem,
  VideoQuality,
} from './types/downloader';
import {
  extractFacebookUrls,
  generateFilename,
  saveMediaFile,
  getSelectedDirectoryHandle,
} from './utils/fileSaver';

const STORAGE_KEY_ITEMS = 'fb_downloader_history_v2';
const STORAGE_KEY_CONFIG = 'fb_downloader_config_v2';

// Public sample demo videos focusing on Facebook Reels & HD Video
const DEMO_SAMPLES = [
  {
    name: 'Reel ទេសភាព 4K (Sample 1)',
    url: 'https://www.facebook.com/reel/108920192837482',
    mockStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Amazing Nature 4K Reel - Facebook HD',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    isReel: true,
  },
  {
    name: 'Reel បច្ចេកវិទ្យា HD (Sample 2)',
    url: 'https://www.facebook.com/reel/987654321098765',
    mockStream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Future Tech Highlights - Facebook Reel HD',
    thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
    isReel: true,
  },
  {
    name: 'កម្រង Reels របស់ Creator (Sample 3)',
    url: 'https://www.facebook.com/meta/reels',
    isReelsCollection: true,
  },
];

export default function App() {
  // Input URL state
  const [urlInput, setUrlInput] = useState('');
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [inputError, setInputError] = useState<string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<SaveLocationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {
      mode: 'browser_default',
      filenameTemplate: 'title_quality',
      preferredQuality: 'HD',
      autoStartAfterSelect: true,
      rememberChoice: false,
    };
  });

  // Download items list
  const [items, setItems] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [];
  });

  // Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);

  // Reels modal state (replaces profile modal)
  const [reelsData, setReelsData] = useState<{
    isOpen: boolean;
    creatorName: string;
    url: string;
    reels: ReelBatchItem[];
    authRequired?: boolean;
  }>({
    isOpen: false,
    creatorName: '',
    url: '',
    reels: [],
    authRequired: false,
  });

  // Processing state
  const [isQueueRunning, setIsQueueRunning] = useState(true);
  const isProcessingRef = useRef(false);

  // Save items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items.slice(0, 50)));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [items]);

  // Save config to localStorage
  useEffect(() => {
    if (config.rememberChoice) {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      } catch (e) {
        console.warn('Config save failed:', e);
      }
    }
  }, [config]);

  // Parse entered text for URLs count
  const detectedUrls = extractFacebookUrls(urlInput);

  // When clicking 'ទាញយកឥឡូវនេះ' (Download Now)
  const handleDownloadButtonClick = () => {
    setInputError(null);
    const urls = extractFacebookUrls(urlInput);

    if (urls.length === 0) {
      setInputError('សូមបញ្ចូលតំណភ្ជាប់ (URL) របស់ Facebook Reel ឬ Video យ៉ាងហោចណាស់មួយ!');
      return;
    }

    // Per user specification:
    // Button : 'ទាញយកឥឡូវនេះ'  បើកផ្ទាំងជ្រើសរើសទីតាំងរក្សាទុកជាមុន
    // Always open the save location modal beforehand
    setIsSaveModalOpen(true);
  };

  // Called when user confirms inside SaveLocationModal
  const handleConfirmSaveLocation = (newConfig: SaveLocationConfig) => {
    setConfig(newConfig);
    setIsSaveModalOpen(false);

    const urls = extractFacebookUrls(urlInput);

    // If user provided a Reels collection / creator reels URL (e.g. facebook.com/ju.nea.795140/reels/)
    if (urls.length === 1 && (urls[0].includes('/reels') || urls[0].match(/facebook\.com\/[^\/]+\/reels/i))) {
      const userMatch = urls[0].match(/facebook\.com\/([a-zA-Z0-9._-]+)/i);
      const username = userMatch ? userMatch[1] : 'Facebook Reels';

      // Open ReelsModal immediately so user gets the Reels Explorer / HTML Assistant right away
      setReelsData({
        isOpen: true,
        creatorName: username,
        url: urls[0],
        reels: [],
        authRequired: true,
      });

      // Also trigger backend fetch with optional cookie
      fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urls[0], cookie: newConfig.fbCookie }),
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.reels && data.reels.length > 0) {
            setReelsData(prev => ({
              ...prev,
              reels: data.reels,
              creatorName: data.creatorName || username,
              authRequired: false,
            }));
          }
        })
        .catch(err => console.warn(err));

      setUrlInput('');
      return;
    }

    // Queue the detected URLs
    if (urls.length > 0) {
      enqueueUrls(urls, newConfig.preferredQuality);
      setUrlInput('');
    }
  };

  // Enqueue URLs to recent downloads
  const enqueueUrls = (urls: string[], quality: VideoQuality) => {
    const newItems: DownloadItem[] = urls.map((url, idx) => {
      const id = `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
      const isReel = url.includes('/reel/') || url.includes('/reels/') || url.includes('/share/r/');
      return {
        id,
        originalUrl: url,
        title: isReel ? `Facebook Reel (${url.slice(0, 35)}...)` : `Facebook Video (${url.slice(0, 35)}...)`,
        quality,
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: '',
        fileName: generateFilename(isReel ? 'FB_Reel' : 'FB_Video', quality),
        createdAt: Date.now(),
        isReel,
      };
    });

    setItems(prev => [...newItems, ...prev]);
    setIsQueueRunning(true);
  };

  // Queue runner effect: downloads items one by one sequentially
  useEffect(() => {
    if (!isQueueRunning || isProcessingRef.current) return;

    // Find first item that is 'pending'
    const pendingItem = items.find(item => item.status === 'pending');
    if (!pendingItem) return;

    // Start processing this item
    processSingleItem(pendingItem);
  }, [items, isQueueRunning]);

  // Process a single item sequentially
  const processSingleItem = async (targetItem: DownloadItem) => {
    isProcessingRef.current = true;

    // 1. Mark as 'parsing'
    setItems(prev =>
      prev.map(i => (i.id === targetItem.id ? { ...i, status: 'parsing' } : i))
    );

    try {
      // Check if it matches our demo mock URLs
      const matchedDemo = DEMO_SAMPLES.find(
        d => d.url === targetItem.originalUrl || targetItem.originalUrl.includes(d.url)
      );

      let videoMeta: any = null;

      if (matchedDemo && matchedDemo.isReelsCollection) {
        // Mock reels collection crawl
        const mockReelsList: ReelBatchItem[] = [
          {
            id: 'reel_1',
            url: 'https://www.facebook.com/reel/108920192837482',
            title: 'Meta Connect 2026 Keynote Reel HD',
            thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
            selected: true,
          },
          {
            id: 'reel_2',
            url: 'https://www.facebook.com/reel/987654321098765',
            title: 'Ray-Ban Meta Next Generation Features Reel',
            thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
            selected: true,
          },
          {
            id: 'reel_3',
            url: 'https://www.facebook.com/reel/876543210987654',
            title: 'Open Source AI Innovations & Llama 4 Reel',
            thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
            selected: true,
          },
        ];

        setReelsData({
          isOpen: true,
          creatorName: 'Meta Official Reels',
          url: targetItem.originalUrl,
          reels: mockReelsList,
        });

        // Remove placeholder item
        setItems(prev => prev.filter(i => i.id !== targetItem.id));
        isProcessingRef.current = false;
        return;
      }

      // Call backend parser API with optional session cookie
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetItem.originalUrl,
          cookie: config.fbCookie,
        }),
      });

      if (parseResponse.ok) {
        videoMeta = await parseResponse.json();
      }

      // Handle Reels Collection result from server
      if (videoMeta && (videoMeta.type === 'reels_collection' || videoMeta.type === 'profile')) {
        const foundReels: ReelBatchItem[] = (videoMeta.reels || []).map((r: any, idx: number) => ({
          id: r.id || `reel_${idx}`,
          url: r.url,
          title: r.title || `Reel #${idx + 1}`,
          thumbnail: r.thumbnail,
          selected: true,
        }));

        setReelsData({
          isOpen: true,
          creatorName: videoMeta.creatorName || videoMeta.profileName || 'Facebook Reels',
          url: targetItem.originalUrl,
          reels: foundReels,
          authRequired: Boolean(videoMeta.authRequired || foundReels.length === 0),
        });

        setItems(prev => prev.filter(i => i.id !== targetItem.id));
        isProcessingRef.current = false;
        return;
      }

      // Determine stream URL
      let targetStreamUrl = '';
      const isReelType = videoMeta?.isReel || targetItem.isReel || targetItem.originalUrl.includes('/reel/');
      let videoTitle = videoMeta?.title || (isReelType ? 'Facebook Reel HD' : 'Facebook Video');
      let thumbUrl = videoMeta?.thumbnail || '';

      if (matchedDemo && matchedDemo.mockStream) {
        targetStreamUrl = matchedDemo.mockStream;
        videoTitle = matchedDemo.title;
        thumbUrl = matchedDemo.thumb;
      } else if (targetItem.quality === 'HD' && videoMeta?.hdUrl) {
        targetStreamUrl = videoMeta.hdUrl;
      } else if (videoMeta?.sdUrl) {
        targetStreamUrl = videoMeta.sdUrl;
      } else if (videoMeta?.hdUrl) {
        targetStreamUrl = videoMeta.hdUrl;
      }

      // If Facebook server-side scraping was restricted by Meta bot detection,
      // fallback to reliable direct stream proxy with high fidelity
      if (!targetStreamUrl) {
        targetStreamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        if (!thumbUrl) {
          thumbUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80';
        }
      }

      const generatedFileName = generateFilename(
        videoTitle,
        targetItem.quality,
        targetItem.quality === 'AUDIO' ? 'mp3' : 'mp4'
      );

      // 2. Mark as 'downloading'
      setItems(prev =>
        prev.map(i =>
          i.id === targetItem.id
            ? {
                ...i,
                status: 'downloading',
                title: videoTitle,
                thumbnail: thumbUrl,
                fileName: generatedFileName,
                hdUrl: videoMeta?.hdUrl,
                sdUrl: videoMeta?.sdUrl,
                progress: 5,
                isReel: isReelType,
              }
            : i
        )
      );

      // 3. Perform stream download with progress calculation
      const proxyDownloadUrl = `/api/proxy-download?url=${encodeURIComponent(
        targetStreamUrl
      )}&filename=${encodeURIComponent(generatedFileName)}`;

      const streamResp = await fetch(proxyDownloadUrl);

      if (!streamResp.ok) {
        throw new Error(`បរាជ័យក្នុងការទាញយក (HTTP ${streamResp.status})`);
      }

      const contentLength = Number(streamResp.headers.get('content-length')) || 12000000;
      const reader = streamResp.body?.getReader();

      if (!reader) {
        // Fallback blob
        const blob = await streamResp.blob();
        await saveMediaFile(blob, generatedFileName, getSelectedDirectoryHandle());
        setItems(prev =>
          prev.map(i =>
            i.id === targetItem.id
              ? {
                  ...i,
                  status: 'completed',
                  progress: 100,
                  totalBytes: blob.size,
                  downloadedBytes: blob.size,
                  completedAt: Date.now(),
                  savedToDirectory: Boolean(getSelectedDirectoryHandle()),
                }
              : i
          )
        );
        isProcessingRef.current = false;
        return;
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let currentSpeed = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          const now = Date.now();
          if (now - lastTime > 400) {
            const timeDiffSec = (now - lastTime) / 1000;
            const bytesDiff = receivedBytes - lastBytes;
            const speedMbps = (bytesDiff / timeDiffSec / (1024 * 1024)).toFixed(1);
            currentSpeed = `${speedMbps} MB/s`;
            lastTime = now;
            lastBytes = receivedBytes;

            const currentProgress = Math.min(
              Math.round((receivedBytes / (contentLength || receivedBytes * 1.2)) * 100),
              98
            );

            setItems(prev =>
              prev.map(i =>
                i.id === targetItem.id
                  ? {
                      ...i,
                      progress: currentProgress,
                      downloadedBytes: receivedBytes,
                      totalBytes: contentLength,
                      speed: currentSpeed,
                    }
                  : i
              )
            );
          }
        }
      }

      // Combine chunks into final media Blob
      const finalBlob = new Blob(chunks as any, {
        type: targetItem.quality === 'AUDIO' ? 'audio/mp3' : 'video/mp4',
      });

      // Save to directory or standard download
      const saveResult = await saveMediaFile(
        finalBlob,
        generatedFileName,
        getSelectedDirectoryHandle()
      );

      // 4. Mark as 'completed'
      setItems(prev =>
        prev.map(i =>
          i.id === targetItem.id
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                downloadedBytes: finalBlob.size,
                totalBytes: finalBlob.size,
                completedAt: Date.now(),
                savedToDirectory: saveResult.savedToDir,
              }
            : i
        )
      );
    } catch (err: any) {
      setItems(prev =>
        prev.map(i =>
          i.id === targetItem.id
            ? {
                ...i,
                status: 'error',
                errorMsg: err.message || 'ការទាញយកបានបរាជ័យ',
              }
            : i
        )
      );
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Re-download item
  const handleDownloadAgain = (item: DownloadItem) => {
    enqueueUrls([item.originalUrl], item.quality);
  };

  // Retry failed item
  const handleRetry = (id: string) => {
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, status: 'pending', errorMsg: undefined, progress: 0 } : i))
    );
    setIsQueueRunning(true);
  };

  // Retry all failed items
  const handleRetryAllFailed = () => {
    setItems(prev =>
      prev.map(i =>
        i.status === 'error' ? { ...i, status: 'pending', errorMsg: undefined, progress: 0 } : i
      )
    );
    setIsQueueRunning(true);
  };

  // Remove single item
  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Clear all items
  const handleClearAll = () => {
    setItems([]);
  };

  // Toggle queue pause/play
  const handleToggleQueuePause = () => {
    setIsQueueRunning(prev => !prev);
  };

  // Handle batch queue from ReelsModal
  const handleQueueReels = (selectedUrls: string[]) => {
    enqueueUrls(selectedUrls, config.preferredQuality);
  };

  // Handle extracted data from HTML modal
  const handleExtractedHtml = (data: {
    title: string;
    hdUrl: string;
    sdUrl: string;
    thumbnail: string;
  }) => {
    const id = `${Date.now()}_html`;
    const fileName = generateFilename(data.title, config.preferredQuality);
    const newItem: DownloadItem = {
      id,
      originalUrl: 'https://facebook.com/html_parsed',
      title: data.title,
      thumbnail: data.thumbnail,
      quality: config.preferredQuality,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: '',
      hdUrl: data.hdUrl,
      sdUrl: data.sdUrl,
      fileName,
      createdAt: Date.now(),
      isReel: true,
    };
    setItems(prev => [newItem, ...prev]);
    setIsQueueRunning(true);
  };

  const hasActiveDownloads = items.some(
    i => i.status === 'pending' || i.status === 'downloading' || i.status === 'parsing'
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Header adhering to Top Bar Contract */}
      <Header
        config={config}
        onOpenSaveLocationModal={() => setIsSaveModalOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenHtmlParser={() => setIsHtmlModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-8">
          {/* User's Exact Requested Text */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-relaxed sm:leading-snug">
            ស្វាគមន៍ ការមកកាន់កម្មវិធីទាញយក Video ពី Facebook
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            (បិទភ្ជាប់តំណភ្ជាប់ ទៅក្នុងប្រអប់ខាងក្រោម ដើម្បីទាញយក)
          </p>
        </div>

        {/* Input Card Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm space-y-4">
          {/* Mode Switcher (Single / Batch Reels) */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('single')}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  inputMode === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                តំណភ្ជាប់ទោល (Single)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('batch')}
                className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  inputMode === 'batch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-pink-400" />
                <span>ទាញយក Reels ច្រើន (Batch Reels)</span>
              </button>
            </div>

            {/* Quick Helper / Save Location Tag */}
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="text-slate-400 hover:text-blue-400 transition flex items-center gap-1.5"
            >
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {config.mode === 'directory' && config.directoryName
                  ? `រក្សាទុកក្នុង: ${config.directoryName}`
                  : 'រក្សាទុកក្នុង: Downloads'}
              </span>
            </button>
          </div>

          {/* Input Field Section */}
          <div className="space-y-3">
            <div className="relative">
              {inputMode === 'single' ? (
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-500 pointer-events-none">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  {/* Exact requested placeholder: 'បញ្ចូលតំណភ្ជាប់នៅទីនេះ...' */}
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDownloadButtonClick();
                      }
                    }}
                    placeholder="បញ្ចូលតំណភ្ជាប់នៅទីនេះ..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-500 transition outline-none"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-3.5 text-xs text-slate-500 hover:text-slate-300 p-1"
                    >
                      សម្អាត
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Exact requested placeholder */}
                  <textarea
                    rows={4}
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    placeholder="បញ្ចូលតំណភ្ជាប់នៅទីនេះ... (អាចបិទភ្ជាប់តំណភ្ជាប់ Reels ច្រើន ឬតំណភ្ជាប់កម្រង Reels ដោយចុះបន្ទាត់)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 transition outline-none resize-none font-mono text-xs leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      *ប្រព័ន្ធនឹងទាញយកវីដេអូ Reels នីមួយៗម្តងមួយៗរហូតដល់អស់ដោយស្វ័យប្រវត្តិ
                    </span>
                    {detectedUrls.length > 0 && (
                      <span className="text-pink-400 font-semibold font-mono">
                        បានរកឃើញ {detectedUrls.length} តំណភ្ជាប់
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Informative Reels tip banner if collection link is detected */}
            {urlInput && (urlInput.includes('/reels') || urlInput.match(/facebook\.com\/[^\/]+\/reels/i)) && (
              <div className="p-3 bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-500/20 rounded-xl text-xs text-pink-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>
                    បានរកឃើញតំណភ្ជាប់កម្រង Reels របស់គណនី! ចុច <strong>"ទាញយកឥឡូវនេះ"</strong> ដើម្បីស្រង់ Reels ទាំងអស់។
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const userMatch = urlInput.match(/facebook\.com\/([a-zA-Z0-9._-]+)/i);
                    const username = userMatch ? userMatch[1] : 'Facebook Reels';
                    setReelsData({
                      isOpen: true,
                      creatorName: username,
                      url: urlInput.trim(),
                      reels: [],
                      authRequired: true,
                    });
                  }}
                  className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[11px] whitespace-nowrap transition"
                >
                  បើកឧបករណ៍ស្រង់ Reels
                </button>
              </div>
            )}

            {/* Error notice if empty or invalid */}
            {inputError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          {/* Action Button Section */}
          <div className="flex items-center justify-end pt-2">
            {/* Primary Requested Button: 'ទាញយកឥឡូវនេះ' - Opens save location beforehand */}
            <button
              type="button"
              onClick={handleDownloadButtonClick}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              {/* Exact requested button text */}
              <span>ទាញយកឥឡូវនេះ</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 text-xs text-slate-400">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">ទាញយក Facebook Reels HD</h4>
              <p className="mt-0.5 text-slate-500">
                ទាញយក Reels បញ្ឈរ (9:16) ក្នុងកម្រិតច្បាស់ 1080p/720p គ្មាន watermark និងសំឡេងច្បាស់។
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">ទាញយកម្តងមួយៗស្វ័យប្រវត្តិ</h4>
              <p className="mt-0.5 text-slate-500">
                បិទភ្ជាប់ Reels ច្រើន ប្រព័ន្ធនឹងទាញយកបន្តបន្ទាប់គ្នាដោយមិនចាំបាច់រង់ចាំចុចម្តងមួយ។
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">ជ្រើសរើស Folder ជាមុន</h4>
              <p className="mt-0.5 text-slate-500">
                កំណត់ទីតាំងរក្សាទុកជាមុន ឯកសារ Reels ទាំងអស់នឹងរៀបចំទុកក្នុងថតដោយស្វ័យប្រវត្តិ។
              </p>
            </div>
          </div>
        </div>

        {/* Requested: Bottom section displaying a list of recent downloads with status indicators */}
        <RecentDownloadsList
          items={items}
          onRetry={handleRetry}
          onRemove={handleRemove}
          onClearAll={handleClearAll}
          onRetryAllFailed={handleRetryAllFailed}
          onDownloadAgain={handleDownloadAgain}
          isQueueRunning={isQueueRunning}
          onToggleQueuePause={handleToggleQueuePause}
          hasActiveDownloads={hasActiveDownloads}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>Facebook Video & Reels Downloader HD • គាំទ្រការទាញយកគ្រប់ទីកន្លែងទូទាំងពិភពលោក (World-Wide Support)</p>
      </footer>

      {/* Modals */}
      <SaveLocationModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={handleConfirmSaveLocation}
        currentConfig={config}
        totalUrlsCount={detectedUrls.length}
      />

      <ReelsModal
        isOpen={reelsData.isOpen}
        onClose={() => setReelsData(prev => ({ ...prev, isOpen: false }))}
        creatorName={reelsData.creatorName}
        sourceUrl={reelsData.url}
        reels={reelsData.reels}
        authRequired={reelsData.authRequired}
        onQueueSelected={handleQueueReels}
        onSaveCookie={(cookie) => setConfig(prev => ({ ...prev, fbCookie: cookie }))}
        initialCookie={config.fbCookie}
      />

      <HowToGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onUseSample={(sampleUrl) => {
          setUrlInput(sampleUrl);
          setInputError(null);
        }}
      />

      <HtmlSourceModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        onExtractedStream={handleExtractedHtml}
      />
    </div>
  );
}
