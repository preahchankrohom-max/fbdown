import React from 'react';
import { DownloadItem } from '../types/downloader';
import { formatBytes } from '../utils/fileSaver';
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Download,
  Video,
  Music,
  ExternalLink,
  FolderCheck,
} from 'lucide-react';

interface DownloadItemRowProps {
  item: DownloadItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onDownloadAgain: (item: DownloadItem) => void;
}

export const DownloadItemRow: React.FC<DownloadItemRowProps> = ({
  item,
  onRetry,
  onRemove,
  onDownloadAgain,
}) => {
  const renderStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>កំពុងរង់ចាំ</span>
          </span>
        );
      case 'parsing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-medium bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>កំពុងស្វែងរក HD</span>
          </span>
        );
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-medium bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>កំពុងទាញយក {Math.round(item.progress)}%</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>បានជោគជ័យ</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>បរាជ័យ</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Thumbnail & Info */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          {/* Thumbnail preview */}
          <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg bg-slate-800 shrink-0 overflow-hidden relative border border-slate-700/60 flex items-center justify-center">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : item.quality === 'AUDIO' ? (
              <Music className="w-6 h-6 text-slate-500" />
            ) : (
              <Video className="w-6 h-6 text-slate-500" />
            )}
            <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1 py-0.2 rounded bg-black/80 text-blue-300 font-mono">
              {item.isReel ? `REEL · ${item.quality}` : item.quality}
            </span>
          </div>

          {/* Title and metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-slate-100 truncate" title={item.title}>
                {item.title}
              </h4>
              <a
                href={item.originalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-500 hover:text-slate-300 transition shrink-0"
                title="បើកតំណភ្ជាប់ Facebook"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
              <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                {item.fileName}
              </span>
              {item.totalBytes > 0 && (
                <span className="font-mono tabular-nums">
                  {formatBytes(item.totalBytes)}
                </span>
              )}
              {item.savedToDirectory && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90">
                  <FolderCheck className="w-3 h-3" /> រក្សាទុកក្នុង Folder ផ្ទាល់
                </span>
              )}
            </div>

            {item.errorMsg && (
              <p className="text-xs text-rose-400/90 mt-1 line-clamp-1">
                {item.errorMsg}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Status Badge & Action Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div>{renderStatusBadge()}</div>

          <div className="flex items-center gap-1.5">
            {item.status === 'completed' && (
              <button
                type="button"
                onClick={() => onDownloadAgain(item)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="ទាញយកម្តងទៀត (Re-download)"
              >
                <Download className="w-4 h-4 text-emerald-400" />
              </button>
            )}

            {item.status === 'error' && (
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                className="p-2 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition"
                title="ព្យាយាមម្តងទៀត (Retry)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="លុបចេញពីបញ្ជី"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar (Visible when downloading) */}
      {item.status === 'downloading' && (
        <div className="mt-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono tabular-nums">
            <span>
              {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes || item.downloadedBytes)}
            </span>
            <span>{item.speed || 'កំពុងផ្ទេរទិន្នន័យ...'}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(item.progress, 5)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
