export type VideoQuality = 'HD' | 'SD' | 'AUDIO';

export type DownloadStatus = 'pending' | 'parsing' | 'downloading' | 'completed' | 'error' | 'paused';

export interface DownloadItem {
  id: string;
  originalUrl: string;
  title: string;
  thumbnail?: string;
  quality: VideoQuality;
  status: DownloadStatus;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speed: string; // e.g. "2.4 MB/s"
  hdUrl?: string;
  sdUrl?: string;
  audioUrl?: string;
  fileName: string;
  errorMsg?: string;
  createdAt: number;
  completedAt?: number;
  savedToDirectory?: boolean;
  isReel?: boolean;
}

export interface SaveLocationConfig {
  mode: 'directory' | 'browser_default' | 'prompt_each';
  directoryName?: string;
  filenameTemplate: 'title_quality' | 'fb_timestamp' | 'original_title';
  preferredQuality: VideoQuality;
  autoStartAfterSelect: boolean;
  rememberChoice: boolean;
  fbCookie?: string;
}

export interface ReelBatchItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  author?: string;
  selected: boolean;
}

