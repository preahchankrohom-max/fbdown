import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to clean and unescape Facebook json/html strings
function cleanFbString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\u0026/g, '&')
    .replace(/\\u0025/g, '%')
    .replace(/\\\/+/g, '/')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, '&');
}

// Helper to sanitize filenames
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u1780-\u17FF\-\. ]/g, '_').slice(0, 80).trim();
}

// Helper to extract all Reels from any HTML string or JSON blob
function extractReelsFromHtml(html: string, creatorName = 'Facebook Reels') {
  const reelIds = new Set<string>();

  // 1. Direct /reel/12345 patterns
  for (const m of html.matchAll(/\/reel\/([0-9]{8,25})/gi)) {
    if (m[1]) reelIds.add(m[1]);
  }

  // 2. Escaped JSON \/reel\/12345 patterns
  for (const m of html.matchAll(/facebook\.com\\\/reel\\\/([0-9]{8,25})/gi)) {
    if (m[1]) reelIds.add(m[1]);
  }

  // 3. reel_id or video_id patterns in Relay blobs
  for (const m of html.matchAll(/["'](?:reel_id|video_id)["']\s*:\s*["']([0-9]{8,25})["']/gi)) {
    if (m[1]) reelIds.add(m[1]);
  }

  // 4. Standalone video/reel permalink hrefs
  for (const m of html.matchAll(/href=["'](?:https?:\/\/(?:www\.)?facebook\.com)?\/reel\/([0-9]{8,25})["']/gi)) {
    if (m[1]) reelIds.add(m[1]);
  }

  // 5. Share links for reels
  const shareUrls = new Set<string>();
  for (const m of html.matchAll(/facebook\.com\/(?:share\/r|reel)\/([a-zA-Z0-9_\.-]+)/gi)) {
    if (m[1] && !m[1].startsWith('videos')) {
      if (m[1].match(/^[0-9]+$/)) {
        reelIds.add(m[1]);
      } else {
        shareUrls.add(`https://www.facebook.com/share/r/${m[1]}/`);
      }
    }
  }

  const resultList: any[] = [];
  let index = 1;

  for (const id of Array.from(reelIds)) {
    resultList.push({
      id: `reel_${id}`,
      url: `https://www.facebook.com/reel/${id}/`,
      title: `${creatorName} - Reel #${index} (${id})`,
      selected: true,
    });
    index++;
  }

  for (const sUrl of Array.from(shareUrls)) {
    resultList.push({
      id: `reel_share_${index}`,
      url: sUrl,
      title: `${creatorName} - Reel #${index}`,
      selected: true,
    });
    index++;
  }

  return {
    count: resultList.length,
    creatorName,
    reels: resultList,
  };
}

// Comprehensive Facebook & Reels URL Parser
async function parseFacebookUrl(fbUrl: string, userCookie?: string) {
  const normalizedUrl = fbUrl.trim();
  
  // Detect if this is a single Facebook Reel
  const isSingleReel = (
    normalizedUrl.includes('/reel/') ||
    normalizedUrl.includes('/share/r/') ||
    normalizedUrl.match(/facebook\.com\/reel\/?\??/i) !== null
  );

  // Detect if this is a Reels collection / Creator Reels page
  const isReelsCollection = (
    (normalizedUrl.includes('/reels') ||
     normalizedUrl.match(/facebook\.com\/[a-zA-Z0-9._-]+\/reels/i) !== null) &&
    !normalizedUrl.includes('/reel/')
  );

  // Extract username if it's a user profile reels URL (e.g. ju.nea.795140)
  const usernameMatch = normalizedUrl.match(/facebook\.com\/([a-zA-Z0-9._-]+)(?:\/reels|\/videos|\/)?/i);
  const detectedUsername = usernameMatch ? usernameMatch[1] : '';

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  if (userCookie && userCookie.trim()) {
    headers['Cookie'] = userCookie.trim();
  }

  try {
    let response = await fetch(normalizedUrl, {
      headers,
      redirect: 'follow',
    });

    let finalUrl = response.url;
    let html = await response.text();

    if (isReelsCollection) {
      // Check if page needs login or Facebook returned error
      const isLoginOrBlocked = (
        html.includes('Sorry, something went wrong') ||
        html.includes('XWebLiteLoginController') ||
        html.includes('<title>Error</title>') ||
        html.includes('login_attempt') ||
        finalUrl.includes('/login')
      );

      // Extract all reels from page HTML
      let creatorName = detectedUsername || 'Facebook Reels';
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1] && !titleMatch[1].includes('Error') && !titleMatch[1].includes('Log in')) {
        creatorName = titleMatch[1].replace(' | Facebook', '').trim();
      }

      const extracted = extractReelsFromHtml(html, creatorName);

      if (extracted.count > 0) {
        return {
          type: 'reels_collection',
          isReel: true,
          creatorName,
          url: normalizedUrl,
          reelCount: extracted.count,
          reels: extracted.reels,
          authRequired: false,
        };
      }

      // If 0 reels found and page was blocked / login required:
      return {
        type: 'reels_collection',
        isReel: true,
        creatorName,
        username: detectedUsername,
        url: normalizedUrl,
        reelCount: 0,
        reels: [],
        authRequired: isLoginOrBlocked || true,
        message: `គណនី ${detectedUsername || 'Facebook'} ត្រូវបានការពារដោយ Facebook (ទាមទារ Login)`,
      };
    }

    // Extract single Video or Reel metadata
    let hdUrl = '';
    let sdUrl = '';
    let title = '';
    let thumbnail = '';
    let duration = '0:30';

    // 1. HD URL extraction attempts (Reels & Videos)
    const hdPatterns = [
      /browser_native_hd_url["']\s*:\s*["']([^"']+)["']/i,
      /playable_url_quality_hd["']\s*:\s*["']([^"']+)["']/i,
      /"playbackUrl["']\s*:\s*["']([^"']+)["']/i,
      /"hd_src["']\s*:\s*["']([^"']+)["']/i,
      /"hd_src_no_ratelimit["']\s*:\s*["']([^"']+)["']/i,
    ];

    for (const pattern of hdPatterns) {
      const m = html.match(pattern);
      if (m && m[1]) {
        hdUrl = cleanFbString(m[1]);
        break;
      }
    }

    // 2. SD URL extraction attempts
    const sdPatterns = [
      /browser_native_sd_url["']\s*:\s*["']([^"']+)["']/i,
      /playable_url["']\s*:\s*["']([^"']+)["']/i,
      /"sd_src["']\s*:\s*["']([^"']+)["']/i,
      /"sd_src_no_ratelimit["']\s*:\s*["']([^"']+)["']/i,
      /<meta property=["']og:video["'] content=["']([^"']+)["']/i,
      /<meta property=["']og:video:url["'] content=["']([^"']+)["']/i,
      /<meta property=["']og:video:secure_url["'] content=["']([^"']+)["']/i,
    ];

    for (const pattern of sdPatterns) {
      const m = html.match(pattern);
      if (m && m[1]) {
        sdUrl = cleanFbString(m[1]);
        break;
      }
    }

    // 3. Title extraction
    const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) ||
                       html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = cleanFbString(titleMatch[1]).replace(/ \| Facebook$/i, '').trim();
    }
    if (!title || title.toLowerCase() === 'facebook') {
      const descMatch = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        title = cleanFbString(descMatch[1]).slice(0, 100);
      } else {
        title = isSingleReel ? `Facebook Reel - ${Date.now()}` : `Facebook Video - ${Date.now()}`;
      }
    }

    // 4. Thumbnail extraction (Vertical thumbnail for Reels)
    const thumbMatch = html.match(/preferred_thumbnail["']\s*:\s*\{["']image["']:\s*\{["']uri["']:\s*["']([^"']+)["']/i) ||
                        html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    if (thumbMatch && thumbMatch[1]) {
      thumbnail = cleanFbString(thumbMatch[1]);
    }

    const hasStream = Boolean(hdUrl || sdUrl);

    return {
      type: isSingleReel ? 'reel' : 'video',
      isReel: isSingleReel,
      url: normalizedUrl,
      finalUrl,
      title: title || (isSingleReel ? 'Facebook Reel HD' : 'Facebook Video'),
      thumbnail: thumbnail || '',
      hdUrl: hdUrl || '',
      sdUrl: sdUrl || hdUrl || '',
      hasStream,
      duration,
      extractedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      type: isSingleReel ? 'reel' : 'video',
      isReel: isSingleReel,
      url: normalizedUrl,
      title: isSingleReel ? `Facebook Reel (${normalizedUrl.slice(0, 30)}...)` : `Facebook Video (${normalizedUrl.slice(0, 30)}...)`,
      thumbnail: '',
      hdUrl: '',
      sdUrl: '',
      hasStream: false,
      error: error.message || 'Failed to fetch Facebook page',
    };
  }
}

// 1. Single URL Parse Endpoint
app.post('/api/parse', async (req: Request, res: Response) => {
  try {
    const { url, cookie } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'សូមបញ្ចូលតំណភ្ជាប់ (URL) របស់ Facebook' });
    }

    const result = await parseFacebookUrl(url, cookie);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error parsing Facebook URL' });
  }
});

// 2. Extract Reels directly from pasted HTML
app.post('/api/extract-reels-from-html', (req: Request, res: Response) => {
  try {
    const { html, creatorName } = req.body;
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'HTML code is required' });
    }

    const result = extractReelsFromHtml(html, creatorName || 'Facebook Reels');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to extract reels from HTML' });
  }
});

// 3. Batch Parse Endpoint
app.post('/api/batch-parse', async (req: Request, res: Response) => {
  try {
    const { urls, cookie } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const cleanUrls = urls
      .map(u => String(u).trim())
      .filter(u => u.length > 5);

    const results = [];
    for (const u of cleanUrls) {
      const resItem = await parseFacebookUrl(u, cookie);
      results.push(resItem);
    }

    return res.json({ items: results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Batch parsing failed' });
  }
});

// 3. Proxy Download Stream (bypasses CORS & auto-triggers file download with custom filename)
app.get('/api/proxy-download', async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;
    const requestedName = (req.query.filename as string) || 'facebook_video.mp4';
    const cleanName = sanitizeFilename(requestedName);

    if (!videoUrl) {
      return res.status(400).send('Missing url parameter');
    }

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.facebook.com/',
    };

    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const response = await fetch(videoUrl, { headers: upstreamHeaders });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).send(`Failed to fetch media upstream: ${response.statusText}`);
    }

    res.status(response.status);

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanName)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    if (response.body) {
      // Pipe web stream to express response
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              // Wait for drain event
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        } catch (streamErr) {
          res.end();
        }
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(err.message || 'Proxy download stream error');
    }
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Facebook Video Downloader Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
