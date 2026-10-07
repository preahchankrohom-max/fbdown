import React, { useState } from 'react';
import { X, Code, Sparkles, AlertCircle } from 'lucide-react';

interface HtmlSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractedStream: (data: { title: string; hdUrl: string; sdUrl: string; thumbnail: string }) => void;
}

export const HtmlSourceModal: React.FC<HtmlSourceModalProps> = ({
  isOpen,
  onClose,
  onExtractedStream,
}) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    setError(null);
    if (!htmlInput.trim()) {
      setError('សូមបិទភ្ជាប់កូដប្រភព HTML ជាមុនសិន');
      return;
    }

    try {
      const html = htmlInput;
      let hdUrl = '';
      let sdUrl = '';
      let title = '';
      let thumbnail = '';

      // HD pattern
      const hdMatch = html.match(/browser_native_hd_url["']\s*:\s*["']([^"']+)["']/i) ||
                      html.match(/playable_url_quality_hd["']\s*:\s*["']([^"']+)["']/i) ||
                      html.match(/"hd_src["']\s*:\s*["']([^"']+)["']/i);
      if (hdMatch) {
        hdUrl = hdMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\"/g, '"');
      }

      // SD pattern
      const sdMatch = html.match(/browser_native_sd_url["']\s*:\s*["']([^"']+)["']/i) ||
                      html.match(/playable_url["']\s*:\s*["']([^"']+)["']/i) ||
                      html.match(/"sd_src["']\s*:\s*["']([^"']+)["']/i) ||
                      html.match(/<meta property=["']og:video["'] content=["']([^"']+)["']/i);
      if (sdMatch) {
        sdUrl = sdMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\"/g, '"');
      }

      // Title pattern
      const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) ||
                         html.match(/<title>([^<]*)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(' | Facebook', '').trim();
      }

      // Thumb
      const thumbMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
      if (thumbMatch) {
        thumbnail = thumbMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      }

      if (!hdUrl && !sdUrl) {
        setError('មិនអាចរកឃើញតំណភ្ជាប់ HD ឬ SD ក្នុងកូដ HTML នេះទេ។ សូមប្រាកដថាបានចម្លងកូដប្រភពនៃទំព័រវីដេអូនោះត្រឹមត្រូវ។');
        return;
      }

      onExtractedStream({
        title: title || 'Facebook Video (HTML Extracted)',
        hdUrl,
        sdUrl: sdUrl || hdUrl,
        thumbnail,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error parsing HTML');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100 text-base">
              ទាញយកតាមរយៈកូដប្រភព HTML (សម្រាប់វីដេអូ Private)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-300">
          <p className="text-slate-400">
            ប្រសិនបើ Facebook ទាមទារ Login ឬជាវីដេអូក្នុងក្រុមបិទ អ្នកអាចបើកទំព័រវីដេអូ ចុច <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Ctrl + U</kbd> (View Page Source) រួចចម្លងកូដទាំងអស់មកបិទភ្ជាប់នៅទីនេះ៖
          </p>

          <textarea
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="បិទភ្ជាប់កូដ HTML ទាំងស្រុងនៅទីនេះ..."
            rows={8}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            បោះបង់
          </button>
          <button
            type="button"
            onClick={handleParse}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>ទាញយកទិន្នន័យពី HTML</span>
          </button>
        </div>
      </div>
    </div>
  );
};
