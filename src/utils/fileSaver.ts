// Helper to format bytes into readable format
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Global in-memory reference to user-picked folder handle
let selectedDirectoryHandle: any = null;

export function setSelectedDirectoryHandle(handle: any) {
  selectedDirectoryHandle = handle;
}

export function getSelectedDirectoryHandle() {
  return selectedDirectoryHandle;
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// Prompt user to pick a local folder
export async function pickSaveDirectory(): Promise<{ success: boolean; name?: string; handle?: any; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    return { success: false, error: 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ Folder Picker ផ្ទាល់ទេ (វានឹងទាញយកទៅកាន់ Downloads)' };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads',
    });
    selectedDirectoryHandle = handle;
    return { success: true, name: handle.name, handle };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'បានបោះបង់ការជ្រើសរើស Folder' };
    }
    return { success: false, error: err.message || 'បរាជ័យក្នុងការជ្រើសរើស Folder' };
  }
}

// Save binary blob to directory or trigger browser download
export async function saveMediaFile(
  blob: Blob,
  filename: string,
  dirHandle?: any
): Promise<{ savedToDir: boolean; error?: string }> {
  const activeDir = dirHandle || selectedDirectoryHandle;

  if (activeDir && typeof activeDir.getFileHandle === 'function') {
    try {
      // Create file in the selected directory
      const fileHandle = await activeDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { savedToDir: true };
    } catch (e) {
      console.warn('Error saving to folder handle, falling back to download link:', e);
    }
  }

  // Fallback: standard browser download trigger
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { savedToDir: false };
}

// Parse text into multiple URLs
export function extractFacebookUrls(rawText: string): string[] {
  if (!rawText) return [];
  // Split by whitespace, comma, or newline
  const tokens = rawText
    .split(/[\r\n\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 5);

  const urlRegex = /(https?:\/\/(?:www\.|web\.|m\.)?(?:facebook\.com|fb\.watch)[^\s,]*)/gi;
  const urls: string[] = [];

  for (const token of tokens) {
    const matches = token.match(urlRegex);
    if (matches) {
      for (const m of matches) {
        if (!urls.includes(m)) {
          urls.push(m);
        }
      }
    } else if (token.includes('facebook.com') || token.includes('fb.watch')) {
      const fixedUrl = token.startsWith('http') ? token : `https://${token}`;
      if (!urls.includes(fixedUrl)) {
        urls.push(fixedUrl);
      }
    }
  }

  return urls;
}

// Clean and sanitize filename with extension
export function generateFilename(title: string, quality: string, ext = 'mp4'): string {
  const cleanTitle = (title || 'FB_Video')
    .replace(/[\\/:*?"<>|#%&{}]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60)
    .trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${cleanTitle}_${quality}_${dateStr}.${ext}`;
}
