import React, { useState, useEffect } from 'react';
import {
  Film,
  CheckSquare,
  Square,
  Download,
  X,
  ExternalLink,
  Code2,
  Link as LinkIcon,
  Key,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { ReelBatchItem } from '../types/downloader';

interface ReelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  sourceUrl: string;
  reels: ReelBatchItem[];
  authRequired?: boolean;
  onQueueSelected: (selectedUrls: string[]) => void;
  onSaveCookie?: (cookie: string) => void;
  initialCookie?: string;
}

export const ReelsModal: React.FC<ReelsModalProps> = ({
  isOpen,
  onClose,
  creatorName,
  sourceUrl,
  reels: initialReels,
  authRequired = false,
  onQueueSelected,
  onSaveCookie,
  initialCookie = '',
}) => {
  const [items, setItems] = useState<ReelBatchItem[]>(initialReels);
  const [activeTab, setActiveTab] = useState<'list' | 'html' | 'links' | 'cookie'>(
    initialReels.length > 0 ? 'list' : 'html'
  );

  // Input states
  const [htmlInput, setHtmlInput] = useState('');
  const [linksInput, setLinksInput] = useState('');
  const [cookieInput, setCookieInput] = useState(initialCookie);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setItems(initialReels);
    if (initialReels.length > 0) {
      setActiveTab('list');
    } else {
      setActiveTab('html');
    }
  }, [initialReels, isOpen]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    const allSelected = items.every(r => r.selected);
    setItems(items.map(r => ({ ...r, selected: !allSelected })));
  };

  const toggleItem = (id: string) => {
    setItems(items.map(r => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const selectedCount = items.filter(r => r.selected).length;

  const handleQueueAll = () => {
    const selectedUrls = items.filter(r => r.selected).map(r => r.url);
    if (selectedUrls.length > 0) {
      onQueueSelected(selectedUrls);
      onClose();
    }
  };

  // 1. Extract Reels from Pasted HTML Source
  const handleExtractFromHtml = async () => {
    setProcessError(null);
    if (!htmlInput.trim()) {
      setProcessError('សូមបិទភ្ជាប់កូដប្រភព HTML នៃទំព័រ Reels ជាមុនសិន');
      return;
    }

    setIsProcessing(true);
    try {
      const resp = await fetch('/api/extract-reels-from-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlInput,
          creatorName: creatorName || 'Facebook Reels',
        }),
      });

      if (!resp.ok) {
        throw new Error('ការស្រង់ Reels ពី HTML បានបរាជ័យ');
      }

      const data = await resp.json();
      if (!data.reels || data.reels.length === 0) {
        setProcessError(
          'មិនបានរកឃើញតំណភ្ជាប់ Reels ក្នុងកូដ HTML នេះទេ។ សូមប្រាកដថាអ្នកបានចុច Ctrl+U នៅលើទំព័រ Reels ដែលបាន load រួច។'
        );
        setIsProcessing(false);
        return;
      }

      setItems(data.reels);
      setActiveTab('list');
      setHtmlInput('');
    } catch (err: any) {
      setProcessError(err.message || 'Error extracting reels');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Add multiple manual Reels links
  const handleAddManualLinks = () => {
    setProcessError(null);
    if (!linksInput.trim()) {
      setProcessError('សូមបញ្ចូលតំណភ្ជាប់ Reels យ៉ាងហោចណាស់មួយ');
      return;
    }

    const lines = linksInput
      .split(/[\r\n\s,]+/)
      .map(l => l.trim())
      .filter(l => l.length > 5 && (l.includes('facebook.com') || l.includes('fb.watch')));

    if (lines.length === 0) {
      setProcessError('មិនមានតំណភ្ជាប់ Facebook Reel ត្រឹមត្រូវទេ');
      return;
    }

    const newReels: ReelBatchItem[] = lines.map((u, i) => ({
      id: `manual_reel_${Date.now()}_${i}`,
      url: u,
      title: `${creatorName} - Reel #${items.length + i + 1}`,
      selected: true,
    }));

    setItems(prev => [...prev, ...newReels]);
    setLinksInput('');
    setActiveTab('list');
  };

  // 3. Retry with Cookie
  const handleRetryWithCookie = async () => {
    setProcessError(null);
    if (!cookieInput.trim()) {
      setProcessError('សូមបញ្ចូល Facebook Cookie');
      return;
    }

    setIsProcessing(true);
    try {
      if (onSaveCookie) {
        onSaveCookie(cookieInput.trim());
      }

      const resp = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sourceUrl,
          cookie: cookieInput.trim(),
        }),
      });

      if (!resp.ok) throw new Error('Failed to crawl with cookie');
      const data = await resp.json();

      if (data.reels && data.reels.length > 0) {
        setItems(data.reels);
        setActiveTab('list');
      } else {
        setProcessError(
          'Cookie មិនត្រឹមត្រូវ ឬ Facebook នៅតែបិទការចូលមើល។ សូមប្រើជម្រើស "ស្រង់តាមកូដ HTML" ខាងលើជំនួសវិញ។'
        );
      }
    } catch (err: any) {
      setProcessError(err.message || 'Error crawling with cookie');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy 1-Click console extraction snippet
  const handleCopyConsoleScript = () => {
    const script = `copy([...document.querySelectorAll('a[href*="/reel/"]')].map(a=>a.href).filter((v,i,a)=>a.indexOf(v)===i).join('\\n')); alert('បានចម្លងតំណភ្ជាប់ Reels ទាំងអស់ចូល Clipboard រួចហើយ!');`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-pink-500/20 to-blue-500/20 rounded-xl text-pink-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-base">
                  {creatorName ? `វីដេអូ Reels របស់ ${creatorName}` : 'ជំនួយការទាញយក Facebook Reels'}
                </h3>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-slate-400 hover:text-blue-400 transition"
                    title="បើកមើលលើ Facebook"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {items.length > 0
                  ? `បានរកឃើញ ${items.length} វីដេអូ Reels • ជ្រើសរើសដើម្បីទាញយកម្តងមួយៗក្នុងកម្រិតខ្ពស់ HD`
                  : 'Facebook ទាមទារ Login ដើម្បីមើល Reels ក្នុងគណនីផ្ទាល់ខ្លួននេះ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-pink-400" />
                <span>បញ្ជី Reels ({items.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'html'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ស្រង់តាមកូដ HTML (ងាយ & 100%)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'links'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>បិទភ្ជាប់តំណភ្ជាប់</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cookie')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'cookie'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Cookie គណនី</span>
            </button>
          </div>

          {activeTab === 'list' && items.length > 0 && (
            <div className="text-slate-400 whitespace-nowrap">
              បានជ្រើស: <span className="text-blue-400 font-semibold font-mono">{selectedCount}</span> / {items.length}
            </div>
          )}
        </div>

        {/* Tab 1: Video List (when populated) */}
        {activeTab === 'list' && (
          <>
            <div className="px-6 py-2 bg-slate-900 border-b border-slate-800/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition py-1 px-2 rounded hover:bg-slate-800"
              >
                {items.every(r => r.selected) ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>{items.every(r => r.selected) ? 'ដោះការជ្រើសរើសទាំងអស់' : 'ជ្រើសរើសទាំងអស់'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('html')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>បន្ថែម Reels ទៀត</span>
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto divide-y divide-slate-800/40 flex-1">
              {items.map((reel, idx) => (
                <div
                  key={reel.id}
                  onClick={() => toggleItem(reel.id)}
                  className={`p-3 rounded-xl flex items-center gap-3.5 cursor-pointer transition ${
                    reel.selected
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="text-slate-400">
                    {reel.selected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </div>

                  <div className="w-12 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700/50 flex items-center justify-center">
                    {reel.thumbnail ? (
                      <img
                        src={reel.thumbnail}
                        alt={reel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-5 h-5 text-slate-500" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[8px] bg-black/80 px-1 py-0.2 rounded text-pink-300 font-mono">
                      REEL
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                        Reel #{idx + 1}
                      </span>
                      <h4 className="text-xs font-medium text-slate-200 truncate">
                        {reel.title || `Facebook Reel #${idx + 1}`}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                      {reel.url}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                បិទ
              </button>
              <button
                type="button"
                onClick={handleQueueAll}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>ទាញយក Reels ដែលបានជ្រើស ({selectedCount}) ម្តងមួយៗ</span>
              </button>
            </div>
          </>
        )}

        {/* Tab 2: HTML Extractor (Fastest, 100% Reliable for Private Profile Reels) */}
        {activeTab === 'html' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>វិធីស្រង់ Reels ពីគណនីផ្ទាល់ខ្លួន {creatorName} ក្នុងរយៈពេល ៣ វិនាទី</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                ដោយសារគណនីផ្ទាល់ខ្លួន <strong>{creatorName}</strong> ត្រូវបានការពារដោយ Facebook (ទាមទារ Login ក្នុង Browser របស់អ្នក) អ្នកគ្រាន់តែ៖
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
                <li>
                  បើកទំព័រ <a href={sourceUrl || `https://www.facebook.com/${creatorName}/reels/`} target="_blank" rel="noreferrer" className="text-blue-400 underline font-mono">{sourceUrl || `facebook.com/${creatorName}/reels/`}</a> ក្នុង Browser របស់អ្នក
                </li>
                <li>
                  ចុច <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Ctrl + U</kbd> (View Page Source) រួចចុច <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Ctrl + A</kbd> និង <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Ctrl + C</kbd>
                </li>
                <li>
                  យកកូដទាំងអស់មកបិទភ្ជាប់ (Paste) ក្នុងប្រអប់ខាងក្រោម រួចចុចប៊ូតុង "ស្រង់ Reels ទាំងអស់"
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>បិទភ្ជាប់កូដប្រភព HTML នៃទំព័រ Reels៖</span>
                <span className="text-[11px] text-slate-500">គាំទ្រកូដ Desktop & Mobile</span>
              </label>
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                rows={7}
                placeholder="បិទភ្ជាប់កូដ HTML ទាំងមូលនៅទីនេះ (Ctrl + V)..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {processError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{processError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCopyConsoleScript}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
                title="ចម្លងកូដ 1-Click ដើម្បី Run ក្នុង Console"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">បានចម្លងកូដ Console!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ចម្លង 1-Click Script សម្រាប់ Console</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExtractFromHtml}
                disabled={isProcessing || !htmlInput.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>កំពុងស្រង់ Reels...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>ស្រង់ Reels ទាំងអស់ឥឡូវនេះ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Paste Direct Links */}
        {activeTab === 'links' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-300">
            <p className="text-slate-400">
              អ្នកអាចចម្លងតំណភ្ជាប់ Reels ម្តងមួយៗ ឬច្រើនពីទំព័រ <strong>{creatorName}</strong> រួចបិទភ្ជាប់ក្នុងប្រអប់ខាងក្រោម (មួយតំណភ្ជាប់ក្នុងមួយបន្ទាត់)៖
            </p>

            <textarea
              value={linksInput}
              onChange={(e) => setLinksInput(e.target.value)}
              rows={8}
              placeholder={`https://www.facebook.com/reel/123456789\nhttps://www.facebook.com/reel/987654321\nhttps://www.facebook.com/share/r/abc...`}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none"
            />

            {processError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{processError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddManualLinks}
                disabled={!linksInput.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>បន្ថែម Reels ចូលក្នុងបញ្ជី</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Cookie Authenticated Crawling */}
        {activeTab === 'cookie' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <Key className="w-4 h-4" />
                <span>ប្រើ Cookie សម្រាប់ទាញយកពីគណនី Facebook ដោយស្វ័យប្រវត្តិ</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                បញ្ចូល Cookie ពីកម្មវិធីរុករករបស់អ្នក (ដូចជា `c_user=...; xs=...`)។ ប្រព័ន្ធនឹងប្រើប្រាស់វាដើម្បីទាញយក Reels ពីគណនីបិទ ឬ private profile ដោយមិនចាំបាច់ស្រង់កូដដោយដៃ។
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                បញ្ចូល Facebook Cookie String៖
              </label>
              <textarea
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                rows={4}
                placeholder="c_user=1000...; xs=2%3A...; datr=...;"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {processError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{processError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleRetryWithCookie}
                disabled={isProcessing || !cookieInput.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់ជាមួយ Facebook...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>សាកល្បងទាញយកជាមួយ Cookie</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
