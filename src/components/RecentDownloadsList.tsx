import React, { useState } from 'react';
import { DownloadItem } from '../types/downloader';
import { DownloadItemRow } from './DownloadItemRow';
import {
  ListFilter,
  Trash2,
  RotateCcw,
  Sparkles,
  Inbox,
  Play,
  Pause,
} from 'lucide-react';

interface RecentDownloadsListProps {
  items: DownloadItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onRetryAllFailed: () => void;
  onDownloadAgain: (item: DownloadItem) => void;
  isQueueRunning: boolean;
  onToggleQueuePause: () => void;
  hasActiveDownloads: boolean;
}

export const RecentDownloadsList: React.FC<RecentDownloadsListProps> = ({
  items,
  onRetry,
  onRemove,
  onClearAll,
  onRetryAllFailed,
  onDownloadAgain,
  isQueueRunning,
  onToggleQueuePause,
  hasActiveDownloads,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'error'>('all');

  const filteredItems = items.filter(item => {
    if (filter === 'active') return item.status === 'downloading' || item.status === 'pending' || item.status === 'parsing';
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'error') return item.status === 'error';
    return true;
  });

  const completedCount = items.filter(i => i.status === 'completed').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const activeCount = items.filter(i => i.status === 'downloading' || i.status === 'pending' || i.status === 'parsing').length;

  return (
    <section className="mt-8 border-t border-slate-800/80 pt-8">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-100">
              ប្រវត្តិនៃការទាញយកថ្មីៗ (Recent Downloads)
            </h2>
            <span className="text-xs font-mono font-medium text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full tabular-nums">
              {items.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            បញ្ជីវីដេអូដែលបានទាញយក និងស្ថានភាពនីមួយៗ (Status Indicators)
          </p>
        </div>

        {/* Global Queue Controls & Actions */}
        <div className="flex items-center gap-2">
          {hasActiveDownloads && (
            <button
              type="button"
              onClick={onToggleQueuePause}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
            >
              {isQueueRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>ផ្អាកការទាញយក</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>បន្តការទាញយក</span>
                </>
              )}
            </button>
          )}

          {errorCount > 0 && (
            <button
              type="button"
              onClick={onRetryAllFailed}
              className="px-3 py-1.5 text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ព្យាយាមឡើងវិញទាំងអស់ ({errorCount})</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>សម្អាតទាំងអស់</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Quick Stats */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'ទាំងអស់', count: items.length },
              { id: 'active', label: 'កំពុងដំណើរការ', count: activeCount },
              { id: 'completed', label: 'បានជោគជ័យ', count: completedCount },
              { id: 'error', label: 'បរាជ័យ', count: errorCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filter === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Item List / Empty States */}
      {filteredItems.length > 0 ? (
        <div className="space-y-2.5">
          {filteredItems.map(item => (
            <DownloadItemRow
              key={item.id}
              item={item}
              onRetry={onRetry}
              onRemove={onRemove}
              onDownloadAgain={onDownloadAgain}
            />
          ))}
        </div>
      ) : (
        <div className="p-10 rounded-2xl border border-slate-800/60 bg-slate-900/20 text-center flex flex-col items-center justify-center">
          <div className="p-3 bg-slate-800/60 rounded-2xl text-slate-500 mb-3">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-medium text-slate-300">
            {items.length === 0 ? 'មិនទាន់មានប្រវត្តិនៃការទាញយកនៅឡើយទេ' : 'មិនមានទិន្នន័យក្នុងផ្ទាំងនេះទេ'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {items.length === 0
              ? 'សូមបិទភ្ជាប់តំណភ្ជាប់វីដេអូ Facebook ខាងលើ ហើយចុច "ទាញយកឥឡូវនេះ" ដើម្បីចាប់ផ្តើម'
              : 'ជ្រើសរើសផ្ទាំង "ទាំងអស់" ដើម្បីមើលបញ្ជីវីដេអូផ្សេងទៀត'}
          </p>
        </div>
      )}
    </section>
  );
};
