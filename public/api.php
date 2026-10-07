<?php
/**
 * Facebook Video & Reels Downloader API for PHP / InfinityFree Hosting
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Cookie");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$requestUri = $_SERVER['REQUEST_URI'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Route matching for InfinityFree (.htaccess redirects /api/something to api.php?action=something)
if (!$action) {
    if (strpos($requestUri, 'proxy-download') !== false) {
        $action = 'proxy-download';
    } elseif (strpos($requestUri, 'extract-reels-from-html') !== false) {
        $action = 'extract-reels-from-html';
    } elseif (strpos($requestUri, 'batch-parse') !== false) {
        $action = 'batch-parse';
    } elseif (strpos($requestUri, 'parse') !== false) {
        $action = 'parse';
    }
}

// 1. PROXY DOWNLOAD (Direct streaming MP4 with headers)
if ($action === 'proxy-download') {
    $videoUrl = isset($_GET['url']) ? $_GET['url'] : '';
    $filename = isset($_GET['filename']) ? $_GET['filename'] : 'facebook_video.mp4';
    $filename = preg_replace('/[^a-zA-Z0-9_\-\. ]/', '_', $filename);

    if (!$videoUrl) {
        http_response_code(400);
        echo "Missing url parameter";
        exit();
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $videoUrl);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Referer: https://www.facebook.com/',
        'Accept: */*'
    ]);

    header('Content-Type: video/mp4');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: public, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    curl_exec($ch);
    curl_close($ch);
    exit();
}

// Read JSON Input for POST requests
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// Helper to unescape JSON/HTML strings
function cleanFbString($str) {
    if (!$str) return '';
    $str = str_replace('\u0026', '&', $str);
    $str = str_replace('\u0025', '%', $str);
    $str = str_replace('\/', '/', $str);
    $str = str_replace('\"', '"', $str);
    $str = html_entity_decode($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return $str;
}

// 2. EXTRACT REELS FROM HTML
if ($action === 'extract-reels-from-html') {
    header('Content-Type: application/json');
    $html = isset($data['html']) ? $data['html'] : '';
    $creatorName = isset($data['creatorName']) ? $data['creatorName'] : 'Facebook Reels';

    if (!$html) {
        http_response_code(400);
        echo json_encode(['error' => 'HTML is required']);
        exit();
    }

    $reelIds = [];
    if (preg_match_all('/\/reel\/([0-9]{8,25})/i', $html, $matches)) {
        foreach ($matches[1] as $id) $reelIds[$id] = true;
    }
    if (preg_match_all('/["\'](?:reel_id|video_id)["\']\s*:\s*["\']([0-9]{8,25})["\']/i', $html, $matches)) {
        foreach ($matches[1] as $id) $reelIds[$id] = true;
    }
    if (preg_match_all('/facebook\.com\\\\\/reel\\\\\/([0-9]{8,25})/i', $html, $matches)) {
        foreach ($matches[1] as $id) $reelIds[$id] = true;
    }

    $resultList = [];
    $index = 1;
    foreach (array_keys($reelIds) as $id) {
        $resultList[] = [
            'id' => 'reel_' . $id,
            'url' => 'https://www.facebook.com/reel/' . $id . '/',
            'title' => $creatorName . ' - Reel #' . $index . ' (' . $id . ')',
            'selected' => true
        ];
        $index++;
    }

    echo json_encode([
        'count' => count($resultList),
        'creatorName' => $creatorName,
        'reels' => $resultList
    ]);
    exit();
}

// 3. PARSE FACEBOOK URL
if ($action === 'parse') {
    header('Content-Type: application/json');
    $url = isset($data['url']) ? trim($data['url']) : '';
    $userCookie = isset($data['cookie']) ? trim($data['cookie']) : '';

    if (!$url) {
        http_response_code(400);
        echo json_encode(['error' => 'សូមបញ្ចូលតំណភ្ជាប់ Facebook']);
        exit();
    }

    $isSingleReel = (strpos($url, '/reel/') !== false || strpos($url, '/share/r/') !== false);
    $isReelsCollection = (strpos($url, '/reels') !== false && strpos($url, '/reel/') === false);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    $headers = [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.9,km;q=0.8'
    ];
    if ($userCookie) {
        $headers[] = 'Cookie: ' . $userCookie;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $html = curl_exec($ch);
    $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);

    if ($isReelsCollection) {
        $creatorName = 'Facebook Reels';
        if (preg_match('/<title>([^<]*)<\/title>/i', $html, $m)) {
            $creatorName = str_replace(' | Facebook', '', trim($m[1]));
        }

        $reelIds = [];
        if (preg_match_all('/\/reel\/([0-9]{8,25})/i', $html, $matches)) {
            foreach ($matches[1] as $id) $reelIds[$id] = true;
        }

        $reels = [];
        $i = 1;
        foreach (array_keys($reelIds) as $id) {
            $reels[] = [
                'id' => 'reel_' . $id,
                'url' => 'https://www.facebook.com/reel/' . $id . '/',
                'title' => $creatorName . ' - Reel #' . $i,
                'selected' => true
            ];
            $i++;
        }

        echo json_encode([
            'type' => 'reels_collection',
            'isReel' => true,
            'creatorName' => $creatorName,
            'url' => $url,
            'reelCount' => count($reels),
            'reels' => $reels,
            'authRequired' => (count($reels) === 0)
        ]);
        exit();
    }

    // Single Video / Reel HD Extraction
    $hdUrl = '';
    $sdUrl = '';
    $title = '';
    $thumb = '';

    if (preg_match('/browser_native_hd_url["\']\s*:\s*["\']([^"\']+)["\']/i', $html, $m)) {
        $hdUrl = cleanFbString($m[1]);
    } elseif (preg_match('/playable_url_quality_hd["\']\s*:\s*["\']([^"\']+)["\']/i', $html, $m)) {
        $hdUrl = cleanFbString($m[1]);
    }

    if (preg_match('/browser_native_sd_url["\']\s*:\s*["\']([^"\']+)["\']/i', $html, $m)) {
        $sdUrl = cleanFbString($m[1]);
    } elseif (preg_match('/playable_url["\']\s*:\s*["\']([^"\']+)["\']/i', $html, $m)) {
        $sdUrl = cleanFbString($m[1]);
    }

    if (preg_match('/<meta property=["\']og:title["\'] content=["\']([^"\']+)["\']/i', $html, $m)) {
        $title = cleanFbString($m[1]);
    }
    if (preg_match('/<meta property=["\']og:image["\'] content=["\']([^"\']+)["\']/i', $html, $m)) {
        $thumb = cleanFbString($m[1]);
    }

    echo json_encode([
        'type' => $isSingleReel ? 'reel' : 'video',
        'isReel' => $isSingleReel,
        'url' => $url,
        'finalUrl' => $finalUrl,
        'title' => $title ? $title : ($isSingleReel ? 'Facebook Reel HD' : 'Facebook Video'),
        'thumbnail' => $thumb,
        'hdUrl' => $hdUrl,
        'sdUrl' => $sdUrl ? $sdUrl : $hdUrl,
        'hasStream' => (bool)($hdUrl || $sdUrl)
    ]);
    exit();
}

// Fallback
echo json_encode(['status' => 'ok', 'message' => 'FB Downloader API is running']);
