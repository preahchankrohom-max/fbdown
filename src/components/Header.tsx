import React from 'react';
import { Folder, HardDrive, DownloadCloud, Sparkles, HelpCircle } from 'lucide-react';
import { SaveLocationConfig } from '../types/downloader';

interface HeaderProps {
  config: SaveLocationConfig;
  onOpenSaveLocationModal: () => void;
  onOpenGuide: () => void;
  onOpenHtmlParser: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onOpenSaveLocationModal,
  onOpenGuide,
  onOpenHtmlParser,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 font-bold">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <a href="/" className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>FB Downloader HD</span>
          </a>
        </div>

        {/* Zone 2: Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={onOpenGuide}
            className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>ការណែនាំ</span>
          </button>
          <button
            type="button"
            onClick={onOpenHtmlParser}
            className="hover:text-blue-400 transition-colors"
          >
            បញ្ចូលកូដ HTML
          </button>
        </nav>

        {/* Zone 3: Primary Action (Save Location Selector Button) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenSaveLocationModal}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shadow-sm hover:border-slate-600"
            title="ជ្រើសរើសទីតាំងរក្សាទុកជាមុន"
          >
            {config.mode === 'directory' && config.directoryName ? (
              <>
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[120px] truncate text-blue-300 font-mono">
                  {config.directoryName}
                </span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>ទីតាំង: Downloads</span>
              </>
            )}
            <span className="text-[10px] text-slate-500 font-normal">| ប្តូរ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
