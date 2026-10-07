import React, { useState } from 'react';
import { Folder, HardDrive, Sparkles, Check, X, ShieldAlert, FolderCheck } from 'lucide-react';
import { SaveLocationConfig, VideoQuality } from '../types/downloader';
import { pickSaveDirectory, isFileSystemAccessSupported } from '../utils/fileSaver';

interface SaveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: SaveLocationConfig) => void;
  currentConfig: SaveLocationConfig;
  totalUrlsCount: number;
}

export const SaveLocationModal: React.FC<SaveLocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentConfig,
  totalUrlsCount,
}) => {
  const [config, setConfig] = useState<SaveLocationConfig>(currentConfig);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isFsSupported = isFileSystemAccessSupported();

  const handleChooseFolder = async () => {
    setIsPickingFolder(true);
    setPickError(null);
    const result = await pickSaveDirectory();
    setIsPickingFolder(false);
    if (result.success && result.name) {
      setConfig(prev => ({
        ...prev,
        mode: 'directory',
        directoryName: result.name,
      }));
    } else if (result.error && !result.error.includes('បានបោះបង់')) {
      setPickError(result.error);
    }
  };

  const handleStartDownload = () => {
    onConfirm(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-lg">
                ជ្រើសរើសទីតាំងរក្សាទុកឯកសារជាមុន
              </h3>
              <p className="text-xs text-slate-400">
                កំណត់ទីតាំង និងកម្រិតគុណភាពមុនពេលចាប់ផ្តើមទាញយក {totalUrlsCount > 1 ? `(${totalUrlsCount} វីដេអូ)` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="បិទ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Storage Destination Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              ទីតាំងរក្សាទុក (Save Destination)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Direct Folder Picker */}
              <div
                onClick={() => {
                  if (isFsSupported) {
                    if (!config.directoryName) {
                      handleChooseFolder();
                    } else {
                      setConfig(prev => ({ ...prev, mode: 'directory' }));
                    }
                  }
                }}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  config.mode === 'directory'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
                } ${!isFsSupported ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mb-2">
                    <FolderCheck className="w-5 h-5" />
                  </div>
                  {config.mode === 'directory' && (
                    <span className="flex items-center text-blue-400 text-xs font-medium bg-blue-500/20 px-2 py-0.5 rounded-md">
                      <Check className="w-3.5 h-3.5 mr-1" /> បានជ្រើស
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 text-sm">
                    ជ្រើសរើស Folder ផ្ទាល់ខ្លួន
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {config.directoryName ? (
                      <span className="text-blue-300 font-mono">📁 {config.directoryName}</span>
                    ) : (
                      'រក្សាទុកវីដេអូទាំងអស់ស្វ័យប្រវត្តិចូលទៅកាន់ Folder មួយ'
                    )}
                  </p>
                </div>

                {isFsSupported ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseFolder();
                    }}
                    disabled={isPickingFolder}
                    className="mt-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    {isPickingFolder ? 'កំពុងជ្រើសរើស...' : config.directoryName ? 'ប្តូរ Folder' : 'ចុចជ្រើសរើស Folder'}
                  </button>
                ) : (
                  <p className="mt-2 text-[11px] text-amber-400/90">
                    *កម្មវិធីរុករកនេះគាំទ្រតែ Browser Downloads ប៉ុណ្ណោះ
                  </p>
                )}
              </div>

              {/* Option 2: Browser Default Downloads */}
              <div
                onClick={() => setConfig(prev => ({ ...prev, mode: 'browser_default' }))}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  config.mode === 'browser_default'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-slate-700 text-slate-300 mb-2">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  {config.mode === 'browser_default' && (
                    <span className="flex items-center text-blue-400 text-xs font-medium bg-blue-500/20 px-2 py-0.5 rounded-md">
                      <Check className="w-3.5 h-3.5 mr-1" /> បានជ្រើស
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 text-sm">
                    Downloads របស់ Browser
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    រក្សាទុកទៅកាន់ Folder Downloads ធម្មតារបស់ទូរស័ព្ទ ឬកុំព្យូទ័រ
                  </p>
                </div>
                <div className="mt-3 text-xs text-slate-400 py-1.5">
                  ស្តង់ដារគ្រប់ឧបករណ៍ទាំងអស់
                </div>
              </div>
            </div>

            {pickError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pickError}</span>
              </div>
            )}
          </div>

          {/* Video Quality Preference */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              កម្រិតគុណភាពវីដេអូ (Video Quality)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'HD', label: 'កម្រិតខ្ពស់ HD (1080p/720p)', desc: 'ច្បាស់ខ្លាំង' },
                { id: 'SD', label: 'កម្រិតធម្មតា SD (480p/360p)', desc: 'ទំហំតូច លឿន' },
                { id: 'AUDIO', label: 'សំឡេងសុទ្ធ (MP3/Audio)', desc: 'សម្រាប់ចម្រៀង' },
              ].map(q => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, preferredQuality: q.id as VideoQuality }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.preferredQuality === q.id
                      ? 'border-blue-500 bg-blue-500/15 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-100">{q.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{q.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filename Format Template */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              ទម្រង់ឈ្មោះឯកសារ (Naming Format)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="filenameTemplate"
                  checked={config.filenameTemplate === 'title_quality'}
                  onChange={() => setConfig(prev => ({ ...prev, filenameTemplate: 'title_quality' }))}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <div className="text-slate-200 font-medium">ចំណងជើង + គុណភាព + កាលបរិច្ឆេទ</div>
                  <div className="text-[11px] text-slate-500 font-mono">Video_Title_HD_2026-10-06.mp4</div>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="filenameTemplate"
                  checked={config.filenameTemplate === 'fb_timestamp'}
                  onChange={() => setConfig(prev => ({ ...prev, filenameTemplate: 'fb_timestamp' }))}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <div className="text-slate-200 font-medium">FB + ពេលវេលា</div>
                  <div className="text-[11px] text-slate-500 font-mono">FB_1742089901_HD.mp4</div>
                </div>
              </label>
            </div>
          </div>

          {/* Optional Session Cookie for private profiles */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">
                Facebook Session Cookie (សម្រាប់គណនីបិទ/Private - មិនបង្ខំទេ)
              </label>
            </div>
            <input
              type="password"
              value={config.fbCookie || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, fbCookie: e.target.value }))}
              placeholder="c_user=...; xs=...;"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Remember Choice Toggle */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.rememberChoice}
                onChange={(e) => setConfig(prev => ({ ...prev, rememberChoice: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 border-slate-700 bg-slate-800"
              />
              <span>ចងចាំការកំណត់នេះសម្រាប់លើកក្រោយ (កុំសួរម្តងទៀត)</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
          >
            បោះបង់
          </button>
          <button
            type="button"
            onClick={handleStartDownload}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>យល់ព្រម & ចាប់ផ្តើមទាញយក</span>
          </button>
        </div>
      </div>
    </div>
  );
};
