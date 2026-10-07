import React from 'react';
import { X, CheckCircle, Smartphone, Monitor, Copy, Sparkles } from 'lucide-react';

interface HowToGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseSample: (sampleUrl: string) => void;
}

export const HowToGuideModal: React.FC<HowToGuideModalProps> = ({
  isOpen,
  onClose,
  onUseSample,
}) => {
  if (!isOpen) return null;

  const sampleUrls = [
    {
      title: 'Facebook Reel HD (ទេសភាព 4K)',
      url: 'https://www.facebook.com/reel/108920192837482',
    },
    {
      title: 'បញ្ជី Facebook Reels របស់ Creator (ទាញយកទាំងអស់)',
      url: 'https://www.facebook.com/meta/reels',
    },
    {
      title: 'វីដេអូ Facebook Watch / Reel គំរូ',
      url: 'https://www.facebook.com/watch/?v=10153231379946729',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100 text-base">
            របៀបចម្លងតំណភ្ជាប់ Facebook ដើម្បីទាញយក
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">នៅលើទូរស័ព្ទដៃ (iOS & Android)</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  បើកកម្មវិធី Facebook &rarr; ចុចប៊ូតុង <strong>ចែករំលែក (Share)</strong> នៅលើវីដេអូ ឬ Reel &rarr; ជ្រើសរើស <strong>ចម្លងតំណភ្ជាប់ (Copy Link)</strong> &rarr; រួចបិទភ្ជាប់ (Paste) ក្នុងប្រអប់ខាងលើ។
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">នៅលើកុំព្យូទ័រ (Computer / Browser)</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  ចុចកណ្ដុរស្ដាំ (Right-click) លើវីដេអូ &rarr; ជ្រើសរើស <strong>Show video URL</strong> ឬចម្លង URL ពី Address bar &rarr; រួចបិទភ្ជាប់ (Paste) ក្នុងប្រអប់។
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4">
            <h4 className="font-semibold text-slate-200 mb-2">
              សាកល្បងជាមួយតំណភ្ជាប់គំរូ (Sample Links)
            </h4>
            <div className="space-y-2">
              {sampleUrls.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="text-slate-300 font-medium">{s.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{s.url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUseSample(s.url);
                      onClose();
                    }}
                    className="shrink-0 px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded-md transition"
                  >
                    ប្រើតំណភ្ជាប់នេះ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
