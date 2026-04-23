// 配置
const DEFAULT_PASSWORD = 'zq-htmlico';

function getPasswordAttribute(password) {
  return `data-password="${password}"`;
}

export default {
  async fetch(request, env, ctx) {
    // 从环境变量读取密码，如果没有设置则使用默认密码
    const PASSWORD = env.PASSWORD || DEFAULT_PASSWORD;
    return handleRequest(request, PASSWORD);
  }
};

async function handleRequest(request, PASSWORD) {
  const url = new URL(request.url);

  // 处理登录请求
  if (url.pathname === '/login' && request.method === 'POST') {
    return handleLoginRequest(request, PASSWORD);
  }

  // 检查是否已登录
  const isLoggedIn = await checkLoginStatus(request);

  // 处理 favicon API
  if (url.pathname === '/api/favicon') {
    if (!isLoggedIn) {
      try {
        const data = await request.json();
        if (data.password === PASSWORD) {
          return handleFaviconRequest(request, true);
        }
      } catch (e) {
      }
      return new Response(JSON.stringify({ error: '需要密码验证' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return handleFaviconRequest(request, true);
  }

  // 处理简单 favicon API
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length === 2) {
    const [providedPassword, targetDomain] = pathParts;
    if (providedPassword === PASSWORD) {
      let targetUrl = targetDomain;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      return handleSimpleFaviconRequest(targetUrl);
    } else {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 处理 htmlcode.js 的原有 API
  if (url.pathname === '/fetch' && request.method === 'POST') {
    if (!isLoggedIn) {
      return new Response(JSON.stringify({ error: '需要密码验证' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const formData = await request.formData();
    const targetUrl = formData.get('url');
    if (!targetUrl) {
      return new Response('请输入网址', { status: 400 });
    }
    return fetchWebsite(targetUrl);
  }

  if (url.pathname === '/proxy' && request.method === 'POST') {
    if (!isLoggedIn) {
      return new Response('需要密码验证', { status: 401 });
    }
    const formData = await request.formData();
    const resourceUrl = formData.get('url');
    if (!resourceUrl) {
      return new Response('请输入资源地址', { status: 400 });
    }
    return proxyResource(resourceUrl);
  }

  // 如果未登录，返回登录页面
  if (!isLoggedIn) {
    return new Response(getLoginHTML(PASSWORD), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 返回主页面
  return new Response(getFrontendHTML(PASSWORD), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleLoginRequest(request, PASSWORD) {
  try {
    const data = await request.json();
    if (data.password === PASSWORD) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': 'login=true; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax'
      });
      return new Response(JSON.stringify({ success: true }), { headers });
    }
  } catch (e) {
  }
  return new Response(JSON.stringify({ error: '密码错误' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function checkLoginStatus(request) {
  const cookie = request.headers.get('Cookie');
  return cookie && cookie.includes('login=true');
}

function getLoginHTML(PASSWORD) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZQ-HtmlIco | 登录</title>
    <link rel="icon" href="https://img.520jacky.dpdns.org/i/2026/04/14/937761.webp" type="image/webp">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background: linear-gradient(135deg, #f0f4f8 0%, #e9f0f8 100%);
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
            transition: all 0.3s ease;
        }
        .login-container:hover {
            box-shadow: 0 12px 40px rgba(31, 38, 135, 0.15);
        }
        button[type="submit"] {
            background: linear-gradient(135deg, #4a6fa5 0%, #6b8cce 100%);
            transition: all 0.3s ease;
        }
        button[type="submit"]:hover {
            background: linear-gradient(135deg, #3a5a85 0%, #5a7bc4 100%);
            box-shadow: 0 6px 20px rgba(74, 111, 165, 0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen" ${getPasswordAttribute(PASSWORD)}>
    <div class="login-container rounded-lg p-8 max-w-md w-full">
        <h1 class="text-2xl font-bold text-center text-blue-600 mb-6">ZQ-HtmlIco</h1>
        <h2 class="text-lg font-semibold text-center mb-6">请输入密码</h2>
        <form id="loginForm" class="space-y-4">
            <div>
                <label for="password" class="block text-sm font-medium mb-1">密码</label>
                <input
                    type="password"
                    id="password"
                    placeholder="请输入密码"
                    class="w-full px-4 py-3 border rounded-lg text-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                >
            </div>
            <div>
                <button
                    type="submit"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg transition-colors"
                >
                    登录
                </button>
            </div>
        </form>
        <p id="errorMessage" class="text-red-500 text-sm mt-4 text-center hidden">密码错误，请重试</p>
    </div>
    <script>
        const PASSWORD = document.body.getAttribute('data-password');
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    window.location.href = '/';
                } else {
                    errorMessage.textContent = data.error || '密码错误';
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorMessage.textContent = '登录失败，请重试';
                errorMessage.classList.remove('hidden');
            }
        });
    </script>
</body>
</html>
  `;
}

async function handleFaviconRequest(request, isLoggedIn) {
  try {
    const body = await request.json();
    let targetUrl = body.url;

    console.log('Received favicon request for:', targetUrl);

    if (!targetUrl) {
      console.log('Error: URL is required');
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      console.log('Added https protocol:', targetUrl);
    }

    const fullUrl = new URL(targetUrl);
    const domain = fullUrl.origin;
    console.log('Processing domain:', domain);

    const websiteInfo = await fetchWebsiteInfo(domain);

    let faviconCandidates = [];
    try {
      console.log('Fetching HTML from:', domain);
      const htmlResponse = await fetch(domain, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (htmlResponse.ok) {
        console.log('HTML fetched successfully');
        const html = await htmlResponse.text();
        faviconCandidates = extractAllFaviconsFromHTML(html, domain);
        console.log('Extracted favicon candidates from HTML:', faviconCandidates);

        if (!websiteInfo.title) {
          websiteInfo.title = extractTitleFromHTML(html);
        }
        if (!websiteInfo.description) {
          websiteInfo.description = extractDescriptionFromHTML(html);
        }
      } else {
        console.log('HTML fetch failed with status:', htmlResponse.status);
      }
    } catch (e) {
      console.log('Error fetching HTML:', e.message);
    }

    const commonPaths = [
      '/favicon.ico',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png',
      '/favicon.png',
      '/favicon.svg',
      '/static/favicon.ico',
      '/static/favicon.png',
      '/assets/favicon.ico',
      '/assets/favicon.png',
      '/img/favicon.ico',
      '/img/favicon.png',
      '/favicon-32x32.png',
      '/favicon-16x16.png',
      '/android-chrome-192x192.png',
      '/android-chrome-512x512.png'
    ];

    for (const path of commonPaths) {
      faviconCandidates.push(domain + path);
    }
    console.log('Added common favicon paths, total candidates:', faviconCandidates.length);

    faviconCandidates = [...new Set(faviconCandidates)];
    console.log('After deduplication, total candidates:', faviconCandidates.length);
    console.log('Final candidate list:', faviconCandidates);

    let faviconUrl = null;
    let faviconData = null;

    for (const candidate of faviconCandidates) {
      try {
        console.log('Trying favicon URL:', candidate);
        const response = await fetch(candidate, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.ok) {
          console.log('Favicon found at:', candidate, 'status:', response.status);
          const contentType = response.headers.get('Content-Type');
          console.log('Content-Type:', contentType);
          if (contentType && (contentType.includes('image/') || contentType.includes('application/x-icon'))) {
            if (contentType.includes('image/svg+xml')) {
              console.log('SVG favicon found, skipping:', candidate);
              continue;
            }
            console.log('Valid favicon found:', candidate);
            faviconUrl = candidate;
            faviconData = await response.arrayBuffer();
            break;
          } else {
            console.log('Not an image content type, skipping:', contentType);
          }
        } else {
          console.log('Favicon request failed:', candidate, 'status:', response.status);
        }
      } catch (e) {
        console.log('Error fetching favicon:', candidate, 'error:', e.message);
      }
    }

    if (!faviconUrl && domain.includes('github.com')) {
      console.log('Trying GitHub specific favicon');
      try {
        const githubFavicon = 'https://github.githubassets.com/favicon.ico';
        const response = await fetch(githubFavicon, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.ok) {
          console.log('GitHub favicon found:', githubFavicon);
          faviconUrl = githubFavicon;
          faviconData = await response.arrayBuffer();
        } else {
          console.log('GitHub favicon request failed:', response.status);
        }
      } catch (e) {
        console.log('Error fetching GitHub favicon:', e.message);
      }
    }

    if (!faviconUrl && domain.includes('google.com')) {
      console.log('Trying Google specific favicon');
      try {
        const googleFavicon = 'https://www.google.com/favicon.ico';
        const response = await fetch(googleFavicon, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        if (response.ok) {
          console.log('Google favicon found:', googleFavicon);
          faviconUrl = googleFavicon;
          faviconData = await response.arrayBuffer();
        } else {
          console.log('Google favicon request failed:', response.status);
        }
      } catch (e) {
        console.log('Error fetching Google favicon:', e.message);
      }
    }

    if (faviconUrl && faviconData) {
      console.log('Generating different sizes for favicon');
      const favicons = await generateFaviconSizes(faviconData);

      return new Response(JSON.stringify({
        title: websiteInfo.title || fullUrl.hostname,
        description: websiteInfo.description || '',
        url: targetUrl,
        faviconUrl: faviconUrl,
        favicons: favicons
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('No favicon found, returning error');
    return new Response(JSON.stringify({ error: '无法获取网站图标' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.log('Unexpected error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleSimpleFaviconRequest(targetUrl) {
  try {
    console.log('Received simple favicon request for:', targetUrl);

    if (!targetUrl) {
      console.log('Error: URL is required');
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      console.log('Added https protocol:', targetUrl);
    }

    const fullUrl = new URL(targetUrl);
    const domain = fullUrl.origin;
    console.log('Processing domain:', domain);

    const websiteInfo = await fetchWebsiteInfo(domain);

    let faviconCandidates = [];
    try {
      console.log('Fetching HTML from:', domain);
      const htmlResponse = await fetch(domain, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (htmlResponse.ok) {
        console.log('HTML fetched successfully');
        const html = await htmlResponse.text();
        faviconCandidates = extractAllFaviconsFromHTML(html, domain);
        console.log('Extracted favicon candidates from HTML:', faviconCandidates);

        if (!websiteInfo.title) {
          websiteInfo.title = extractTitleFromHTML(html);
        }
        if (!websiteInfo.description) {
          websiteInfo.description = extractDescriptionFromHTML(html);
        }
      } else {
        console.log('HTML fetch failed with status:', htmlResponse.status);
      }
    } catch (e) {
      console.log('Error fetching HTML:', e.message);
    }

    const commonPaths = [
      '/favicon.ico',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png',
      '/favicon.png',
      '/favicon.svg',
      '/static/favicon.ico',
      '/static/favicon.png',
      '/assets/favicon.ico',
      '/assets/favicon.png',
      '/img/favicon.ico',
      '/img/favicon.png'
    ];

    for (const path of commonPaths) {
      const faviconUrl = new URL(path, domain).href;
      if (!faviconCandidates.includes(faviconUrl)) {
        faviconCandidates.push(faviconUrl);
      }
    }

    if (domain.includes('github.com')) {
      faviconCandidates.push('https://github.com/favicon.ico');
      faviconCandidates.push('https://github.githubassets.com/favicon.ico');
    } else if (domain.includes('google.com')) {
      faviconCandidates.push('https://www.google.com/favicon.ico');
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      faviconCandidates.push('https://abs.twimg.com/favicons/twitter.ico');
    } else if (domain.includes('facebook.com')) {
      faviconCandidates.push('https://www.facebook.com/favicon.ico');
    } else if (domain.includes('instagram.com')) {
      faviconCandidates.push('https://www.instagram.com/favicon.ico');
    }

    console.log('All favicon candidates:', faviconCandidates);

    let faviconData = null;
    let faviconUrl = null;

    for (const candidate of faviconCandidates) {
      try {
        console.log('Trying favicon:', candidate);
        const response = await fetch(candidate, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          redirect: 'follow'
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log('Favicon found with content-type:', contentType);

          if (contentType && contentType.startsWith('image/')) {
            if (contentType === 'image/svg+xml') {
              console.log('Skipping SVG favicon:', candidate);
              continue;
            }

            faviconData = await response.arrayBuffer();
            faviconUrl = candidate;
            console.log('Favicon data received, length:', faviconData.byteLength);
            break;
          } else {
            console.log('Not an image:', contentType);
          }
        } else {
          console.log('Favicon request failed with status:', response.status);
        }
      } catch (e) {
        console.log('Error fetching favicon:', e.message);
      }
    }

    if (faviconData) {
      console.log('Favicon found, returning image');
      return new Response(faviconData, {
        headers: { 'Content-Type': 'image/png' },
      });
    }

    console.log('No favicon found, returning error');
    return new Response(JSON.stringify({ error: '无法获取网站图标' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.log('Unexpected error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function fetchWebsiteInfo(domain) {
  const info = { title: '', description: '' };

  try {
    const response = await fetch(domain, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.ok) {
      const html = await response.text();
      info.title = extractTitleFromHTML(html);
      info.description = extractDescriptionFromHTML(html);
    }
  } catch (e) {
    console.log('Error fetching website info:', e.message);
  }

  return info;
}

function extractTitleFromHTML(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractDescriptionFromHTML(html) {
  const match = html.match(/<meta[^>]+name=["']?description["']?[^>]+content=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function extractAllFaviconsFromHTML(html, baseUrl) {
  const candidates = [];

  const linkRegexes = [
    /<link[^>]+rel=["']?icon["']?[^>]+href=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']?shortcut icon["']?[^>]+href=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']?apple-touch-icon["']?[^>]+href=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']?apple-touch-icon-precomposed["']?[^>]+href=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']?manifest["']?[^>]+href=["']([^"']+)["']/gi
  ];

  for (const regex of linkRegexes) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      let href = match[1];
      if (!href.startsWith('http')) {
        href = new URL(href, baseUrl).href;
      }
      candidates.push(href);
    }
  }

  return candidates;
}

async function generateFaviconSizes(iconData) {
  const sizes = ['16', '32', '64', '128', '256'];
  const favicons = {};

  const base64 = btoa(String.fromCharCode(...new Uint8Array(iconData)));
  const dataUrl = 'data:image/png;base64,' + base64;

  for (const size of sizes) {
    favicons[size] = dataUrl;
  }

  return favicons;
}

async function fetchWebsite(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const code = await response.text();
    const resources = extractResources(code, targetUrl);

    return new Response(JSON.stringify({
      success: true,
      code: code,
      url: targetUrl,
      resources: resources
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

function extractResources(html, baseUrl) {
  const resources = [];
  const baseUrlObj = new URL(baseUrl);

  const resourceTypes = [
    { pattern: /<link[^>]+href=["']([^"']+)["']/gi, type: 'css' },
    { pattern: /<script[^>]+src=["']([^"']+)["']/gi, type: 'js' },
    { pattern: /<img[^>]+src=["']([^"']+)["']/gi, type: 'image' },
    { pattern: /<img[^>]+srcset=["']([^"']+)["']/gi, type: 'image-srcset', multi: true },
    { pattern: /<img[^>]+data-src=["']([^"']+)["']/gi, type: 'image-lazy' },
    { pattern: /<img[^>]+data-lazy=["']([^"']+)["']/gi, type: 'image-lazy' },
    { pattern: /<source[^>]+src=["']([^"']+)["']/gi, type: 'media' },
    { pattern: /<source[^>]+srcset=["']([^"']+)["']/gi, type: 'media-srcset', multi: true },
    { pattern: /<video[^>]+src=["']([^"']+)["']/gi, type: 'media' },
    { pattern: /<video[^>]+poster=["']([^"']+)["']/gi, type: 'poster' },
    { pattern: /<audio[^>]+src=["']([^"']+)["']/gi, type: 'media' },
    { pattern: /<iframe[^>]+src=["']([^"']+)["']/gi, type: 'iframe' },
    { pattern: /<embed[^>]+src=["']([^"']+)["']/gi, type: 'embed' },
    { pattern: /<object[^>]+data=["']([^"']+)["']/gi, type: 'object' },
    { pattern: /<track[^>]+src=["']([^"']+)["']/gi, type: 'track' },
    { pattern: /<input[^>]+src=["']([^"']+)["']/gi, type: 'input-image' },
    { pattern: /<area[^>]+href=["']([^"']+)["']/gi, type: 'area' },
    { pattern: /<meta[^>]+content=["']([^"']+\.(png|jpg|jpeg|gif|webp|svg|ico))["']/gi, type: 'meta-image' },
    { pattern: /url\(["']?([^"')]+\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot))["']?\)/gi, type: 'css-resource' },
    { pattern: /url\(["']?([^"')]+)["']?\)/gi, type: 'css-url' }
  ];

  const seenUrls = new Set();

  for (const { pattern, type, multi } of resourceTypes) {
    let match;
    const patternCopy = new RegExp(pattern.source, pattern.flags);
    while ((match = patternCopy.exec(html)) !== null) {
      let urlsToProcess = [match[1]];

      if (multi) {
        urlsToProcess = parseSrcset(match[1]);
      }

      for (const originalUrl of urlsToProcess) {
        const cleanedUrl = cleanUrl(originalUrl);

        if (!isValidResourceUrl(cleanedUrl)) continue;

        try {
          const fullUrl = new URL(cleanedUrl, baseUrl).href;

          if (seenUrls.has(fullUrl)) continue;
          seenUrls.add(fullUrl);

          if (!isValidExtension(fullUrl)) continue;

          const path = getResourcePath(fullUrl, baseUrlObj, cleanedUrl);

          resources.push({
            url: fullUrl,
            originalUrl: cleanedUrl,
            type: type,
            path: path,
            valid: true
          });
        } catch (e) {
          continue;
        }
      }
    }
  }

  return resources;
}

function cleanUrl(url) {
  return url.trim().split(/[?#]/)[0];
}

function isValidResourceUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('#')) return false;
  if (url.startsWith('javascript:')) return false;
  if (url.startsWith('mailto:')) return false;
  if (url.startsWith('tel:')) return false;
  if (url.startsWith('about:')) return false;
  if (url.startsWith('blob:')) return false;
  return true;
}

function isValidExtension(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    const invalidExtensions = ['.html', '.htm', '.php', '.asp', '.jsp', '.json', '.xml'];
    for (const ext of invalidExtensions) {
      if (pathname.endsWith(ext)) return false;
    }

    const validExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
                            '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', '.mp3', '.wav',
                            '.pdf', '.txt', '.csv'];
    for (const ext of validExtensions) {
      if (pathname.endsWith(ext)) return true;
    }

    if (pathname.includes('.') && pathname.length > 4) return true;

    return false;
  } catch (e) {
    return false;
  }
}

function parseSrcset(srcset) {
  const urls = [];
  const parts = srcset.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const urlPart = trimmed.split(/\s+/)[0];
    if (urlPart) {
      urls.push(urlPart);
    }
  }

  return urls;
}

function getResourcePath(url, baseUrlObj, originalUrl) {
  try {
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      let pathname = originalUrl;
      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }
      if (pathname && !pathname.includes('?') && !pathname.includes('#')) {
        return pathname.replace(/[<>:\"|?*]/g, '_');
      }
    }

    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    if (pathname === '/') {
      pathname = '/index';
    }

    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }

    if (!pathname.includes('.')) {
      pathname += '.html';
    }

    return pathname.replace(/[<>:\"|?*]/g, '_');
  } catch (e) {
    return 'resource_' + Math.random().toString(36).substr(2, 9);
  }
}

async function proxyResource(resourceUrl) {
  try {
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response('Failed to fetch resource', { status: 500 });
  }
}

function getFrontendHTML(PASSWORD) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>ZQ-HtmlIco</title>
    <link rel="icon" href="https://img.520jacky.dpdns.org/i/2026/04/14/937761.webp" type="image/webp">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <style>
        body {
            background: linear-gradient(135deg, #f0f4f8 0%, #e9f0f8 100%);
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .glass-effect {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            box-shadow: 0 12px 40px rgba(31, 38, 135, 0.15);
            transform: translateY(-4px);
        }
        .tab-btn {
            transition: all 0.3s ease;
        }
        .tab-btn.active {
            background: linear-gradient(135deg, #4a6fa5 0%, #6b8cce 100%);
            color: white;
        }
        .prefix {
            font-weight: 600;
            margin-right: 10px;
            width: 100px;
            display: inline-block;
            color: #4a6fa5;
        }
        .website-info-item .content {
            cursor: default;
            user-select: none;
            transition: 0.2s;
        }
        .website-info-item .content:hover {
            text-decoration: underline dashed;
            text-underline-offset: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body class="min-h-screen" ${getPasswordAttribute(PASSWORD)}>
<div class="container mx-auto px-4 py-8 max-w-6xl">
    <div class="relative mb-8">
        <h1 class="text-3xl font-bold text-center text-blue-600">ZQ-HtmlIco</h1>
        <p class="text-center text-gray-600 mt-2">Favicon获取 + 网站源代码工具</p>
        <div class="text-center mt-4">
            <a href="https://github.com/bayueqi/ZQ-HtmlIco" target="_blank" class="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full text-sm transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path>
                </svg>
                GitHub 仓库
            </a>
        </div>
    </div>

    <div class="flex gap-2 mb-6 justify-center flex-wrap">
        <button class="tab-btn active px-6 py-2 rounded-lg font-medium" data-tab="favicon">获取 Favicon</button>
        <button class="tab-btn px-6 py-2 rounded-lg font-medium bg-gray-200" data-tab="fetch">获取源代码</button>
        <button class="tab-btn px-6 py-2 rounded-lg font-medium bg-gray-200" data-tab="compress">压缩/解压 HTML</button>
    </div>

    <div id="faviconTab" class="tab-content">
        <div class="glass-effect card-hover rounded-lg p-6 mb-6">
            <form id="urlForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">输入网站URL</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            type="url"
                            id="urlInput"
                            placeholder="https://example.com"
                            class="flex-1 px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                        <button
                            type="submit"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg transition-colors"
                        >
                            获取
                        </button>
                    </div>
                    <p id="errorMessage" class="text-red-500 text-sm mt-1 hidden">请输入有效的URL</p>
                </div>
            </form>
        </div>

        <div id="loadingState" class="hidden text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p class="mt-4 text-lg">正在获取网站图标和描述...</p>
        </div>

        <div id="resultsContainer" class="hidden glass-effect card-hover rounded-lg p-6">
            <h2 class="text-xl font-bold mb-4 pb-2 border-b">网站信息</h2>
            <div class="space-y-6">
                <div class="flex items-center gap-4">
                    <div id="faviconContainer" class="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                        <img id="faviconImage" class="max-w-full max-h-full object-contain" src="" alt="网站Favicon">
                    </div>
                    <div class="website-info flex-1">
                        <div class="website-info-item website-url">
                            <span class="prefix">网站地址：</span><span class="content"></span>
                        </div>
                        <div class="website-info-item website-title">
                            <span class="prefix">网站标题：</span><span class="content"></span>
                        </div>
                        <div class="website-info-item website-description">
                            <span class="prefix">网站描述：</span><span class="content" id="websiteDescription"></span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold mb-2">不同尺寸的 Favicon (PNG格式)：</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        <div id="favicon16" class="bg-gray-100 p-4 rounded-lg text-center">
                            <div class="flex justify-center items-center h-16">
                                <img class="favicon-size" width="16" height="16" alt="16x16 favicon">
                            </div>
                            <p class="mt-2 text-sm">16×16</p>
                            <a href="#" class="inline-block text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-200" data-size="16">下载</a>
                        </div>
                        <div id="favicon32" class="bg-gray-100 p-4 rounded-lg text-center">
                            <div class="flex justify-center items-center h-16">
                                <img class="favicon-size" width="32" height="32" alt="32x32 favicon">
                            </div>
                            <p class="mt-2 text-sm">32×32</p>
                            <a href="#" class="inline-block text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-200" data-size="32">下载</a>
                        </div>
                        <div id="favicon64" class="bg-gray-100 p-4 rounded-lg text-center">
                            <div class="flex justify-center items-center h-16">
                                <img class="favicon-size" width="64" height="64" alt="64x64 favicon">
                            </div>
                            <p class="mt-2 text-sm">64×64</p>
                            <a href="#" class="inline-block text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-200" data-size="64">下载</a>
                        </div>
                        <div id="favicon128" class="bg-gray-100 p-4 rounded-lg text-center">
                            <div class="flex justify-center items-center h-16 overflow-hidden">
                                <img class="favicon-size max-h-full max-w-full object-contain" width="64" height="64" alt="128x128 favicon">
                            </div>
                            <p class="mt-2 text-sm">128×128</p>
                            <a href="#" class="inline-block text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-200" data-size="128">下载</a>
                        </div>
                        <div id="favicon256" class="bg-gray-100 p-4 rounded-lg text-center">
                            <div class="flex justify-center items-center h-16 overflow-hidden">
                                <img class="favicon-size max-h-full max-w-full object-contain" width="64" height="64" alt="256x256 favicon">
                            </div>
                            <p class="mt-2 text-sm">256×256</p>
                            <a href="#" class="inline-block text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-200" data-size="256">下载</a>
                        </div>
                    </div>
                    <div id="viewStatus" class="mt-2 text-sm text-green-600 hidden">正在下载图标...</div>
                </div>
            </div>
        </div>

        <div id="errorContainer" class="hidden bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 class="text-lg font-medium text-red-800 mt-3">获取失败</h3>
            <p id="errorContainerMessage" class="mt-2 text-red-700"></p>
        </div>
    </div>

    <div id="fetchTab" class="tab-content hidden">
        <div class="glass-effect card-hover rounded-lg p-6 mb-6">
            <form id="fetchForm">
                <div class="space-y-4">
                    <label class="block text-sm font-medium">输入网站URL</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input type="url" id="fetchUrlInput" placeholder="https://example.com" class="flex-1 px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        <button type="submit" id="fetchBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg transition-colors">获取源代码</button>
                    </div>
                </div>
            </form>
        </div>

        <div id="fetchResultSection" class="hidden glass-effect card-hover rounded-lg p-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 id="fetchResultTitle" class="text-xl font-bold">源代码</h2>
                <div class="flex gap-2">
                    <button type="button" id="copyBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">📋 复制</button>
                    <button type="button" id="downloadHtmlBtn" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg">💾 下载HTML</button>
                    <button type="button" id="downloadAllBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">📦 下载全部资源</button>
                </div>
            </div>
            <div id="progressSection" class="hidden mb-4">
                <div class="bg-gray-200 rounded-lg p-4">
                    <div class="h-5 bg-gray-300 rounded-full overflow-hidden mb-2">
                        <div class="h-full bg-blue-600 progress-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                    <p class="text-sm text-gray-700" id="progressText">准备下载...</p>
                </div>
                <div class="resource-list max-h-60 overflow-y-auto bg-gray-100 rounded-lg p-3 mt-2" id="resourceList"></div>
            </div>
            <pre id="codeDisplay" class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto text-sm"></pre>
        </div>

        <div id="fetchError" class="hidden bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 class="text-lg font-medium text-red-800">获取失败</h3>
            <p id="fetchErrorMsg" class="mt-2 text-red-700"></p>
        </div>
    </div>

    <div id="compressTab" class="tab-content hidden">
        <div class="glass-effect card-hover rounded-lg p-6 mb-6">
            <div class="space-y-4">
                <label class="block text-sm font-medium">输入或粘贴 HTML 代码</label>
                <textarea id="htmlInput" placeholder="在此输入或粘贴 HTML 代码..." class="w-full px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-48 font-mono"></textarea>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" id="compressBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg">📦 压缩 HTML</button>
                    <button type="button" id="decompressBtn" class="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg">✨ 解压/格式化</button>
                    <button type="button" id="clearBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg">🗑️ 清空</button>
                </div>
            </div>
        </div>

        <div id="compressResultSection" class="hidden glass-effect card-hover rounded-lg p-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 id="compressResultTitle" class="text-xl font-bold">结果</h2>
                <div class="flex gap-2">
                    <button type="button" id="compressCopyBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">📋 复制</button>
                    <button type="button" id="compressDownloadBtn" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg">💾 下载</button>
                </div>
            </div>
            <pre id="compressCodeDisplay" class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto text-sm"></pre>
        </div>
    </div>
</div>

<script>
const PASSWORD = document.body.getAttribute('data-password');

const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabs.forEach(t => t.classList.add('bg-gray-200'));
        tab.classList.add('active');
        tab.classList.remove('bg-gray-200');
        
        tabContents.forEach(c => c.classList.add('hidden'));
        document.getElementById(tab.getAttribute('data-tab') + 'Tab').classList.remove('hidden');
    });
});

const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const errorMessage = document.getElementById('errorMessage');
const loadingState = document.getElementById('loadingState');
const resultsContainer = document.getElementById('resultsContainer');
const errorContainer = document.getElementById('errorContainer');
const errorContainerMessage = document.getElementById('errorContainerMessage');
const faviconImage = document.getElementById('faviconImage');
const websiteUrlContent = document.querySelector('.website-url .content');
const websiteTitleContent = document.querySelector('.website-title .content');
const websiteDescription = document.getElementById('websiteDescription');

urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('hidden');
    errorContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');

    const url = urlInput.value.trim();
    if (!isValidUrl(url)) {
        errorMessage.classList.remove('hidden');
        return;
    }

    const submitButton = urlForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '处理中...';

    loadingState.classList.remove('hidden');
    try {
        const response = await fetch('/api/favicon', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, password: PASSWORD}),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '获取网站数据失败');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError(error.message || "获取网站元数据失败");
    } finally {
        loadingState.classList.add('hidden');
        submitButton.disabled = false;
        submitButton.textContent = '获取';
    }
});

function isValidUrl(string) {
    try {
        let urlToCheck = string;
        if (!string.startsWith('http://') && !string.startsWith('https://')) {
            urlToCheck = 'https://' + string;
        }
        const url = new URL(urlToCheck);
        return url.hostname.includes('.');
    } catch (_) {
        return false;
    }
}

function showError(message) {
    errorContainer.classList.remove('hidden');
    errorContainerMessage.textContent = message;
    resultsContainer.classList.add('hidden');
}

function displayResults(data) {
    websiteUrlContent.textContent = data.url;
    websiteTitleContent.textContent = data.title || new URL(data.url).hostname;
    websiteDescription.textContent = data.description || '没有找到网站描述';
    faviconImage.src = data.favicons['128'] || data.faviconUrl;
    faviconImage.alt = data.title + ' favicon';

    const sizes = ['16', '32', '64', '128', '256'];
    sizes.forEach(size => {
        if (data.favicons[size]) {
            const img = document.querySelector('#favicon' + size + ' img');
            img.src = data.favicons[size];
            img.alt = size + 'x' + size + ' favicon';
            const btn = document.querySelector('#favicon' + size + ' a');
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const viewStatus = document.getElementById('viewStatus');
                viewStatus.textContent = '正在下载 ' + size + 'x' + size + ' 图标...';
                viewStatus.classList.remove('hidden');
                
                const canvas = document.createElement('canvas');
                canvas.width = parseInt(size);
                canvas.height = parseInt(size);
                const ctx = canvas.getContext('2d');
                
                const tempImg = new Image();
                tempImg.onload = function() {
                    ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                    const resizedDataUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = resizedDataUrl;
                    link.download = 'favicon-' + size + '.png';
                    link.click();
                    setTimeout(() => viewStatus.classList.add('hidden'), 3000);
                };
                tempImg.src = data.favicons[size];
            });
        }
    });

    [websiteUrlContent, websiteTitleContent, websiteDescription].forEach((element) => {
        element.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                element.style.backgroundColor = '#e0f2ff';
                setTimeout(() => element.style.backgroundColor = '', 1500);
            }).catch((err) => console.error('复制失败:', err));
        });
    });

    resultsContainer.classList.remove('hidden');
}

const fetchForm = document.getElementById('fetchForm');
const fetchUrlInput = document.getElementById('fetchUrlInput');
const fetchBtn = document.getElementById('fetchBtn');
const fetchResultSection = document.getElementById('fetchResultSection');
const fetchResultTitle = document.getElementById('fetchResultTitle');
const codeDisplay = document.getElementById('codeDisplay');
const copyBtn = document.getElementById('copyBtn');
const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resourceList = document.getElementById('resourceList');
const fetchError = document.getElementById('fetchError');
const fetchErrorMsg = document.getElementById('fetchErrorMsg');

let currentCode = '';
let currentUrl = '';
let currentResources = [];

fetchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let targetUrl = fetchUrlInput.value.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }
    
    fetchBtn.disabled = true;
    fetchBtn.textContent = '获取中...';
    fetchResultSection.style.display = 'none';
    fetchError.classList.add('hidden');
    progressSection.style.display = 'none';
    
    try {
        const formData = new FormData();
        formData.append('url', targetUrl);
        
        const response = await fetch('/fetch', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentCode = data.code;
            currentUrl = targetUrl;
            currentResources = data.resources || [];
            fetchResultTitle.textContent = '网站源码 (' + currentResources.length + ' 个资源)';
            codeDisplay.textContent = currentCode;
            fetchResultSection.style.display = 'block';
        } else {
            fetchErrorMsg.textContent = data.error;
            fetchError.classList.remove('hidden');
        }
    } catch (err) {
        fetchErrorMsg.textContent = err.message;
        fetchError.classList.remove('hidden');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = '获取源代码';
    }
});

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(currentCode);
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => copyBtn.textContent = '📋 复制', 2000);
    } catch (err) {
        alert('复制失败');
    }
});

downloadHtmlBtn.addEventListener('click', () => {
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const hostname = new URL(currentUrl).hostname;
    a.download = hostname + '_source.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

downloadAllBtn.addEventListener('click', async () => {
    if (!currentResources.length) {
        alert('没有可下载的资源');
        return;
    }
    
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '准备下载资源...';
    resourceList.innerHTML = '';
    downloadAllBtn.disabled = true;
    
    const zip = new JSZip();
    const hostname = new URL(currentUrl).hostname;
    
    zip.file('index.html', currentCode);
    
    let downloaded = 0;
    const total = currentResources.length;
    
    for (const resource of currentResources) {
        const listItem = document.createElement('div');
        listItem.className = 'resource-item p-2 bg-white rounded mb-1';
        listItem.innerHTML = '<span class="resource-icon mr-2">⏳</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
        resourceList.appendChild(listItem);
        resourceList.scrollTop = resourceList.scrollHeight;
        
        try {
            const formData = new FormData();
            formData.append('url', resource.url);
            
            const response = await fetch('/proxy', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const blob = await response.blob();
                zip.file(resource.path, blob);
                
                listItem.className = 'resource-item success p-2 bg-white rounded mb-1 border-l-4 border-green-500';
                listItem.innerHTML = '<span class="resource-icon mr-2">✅</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
            } else {
                listItem.className = 'resource-item error p-2 bg-white rounded mb-1 border-l-4 border-red-500';
                listItem.innerHTML = '<span class="resource-icon mr-2">❌</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
            }
        } catch (err) {
            listItem.className = 'resource-item error p-2 bg-white rounded mb-1 border-l-4 border-red-500';
            listItem.innerHTML = '<span class="resource-icon mr-2">❌</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
        }
        
        downloaded++;
        const progress = Math.round((downloaded / total) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = '下载中: ' + downloaded + '/' + total + ' (' + progress + '%)';
    }
    
    progressText.textContent = '正在生成 ZIP 文件...';
    
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = hostname + '_complete.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        progressText.textContent = '下载完成！';
        downloadAllBtn.disabled = false;
    });
});

const htmlInput = document.getElementById('htmlInput');
const compressBtn = document.getElementById('compressBtn');
const decompressBtn = document.getElementById('decompressBtn');
const clearBtn = document.getElementById('clearBtn');
const compressResultSection = document.getElementById('compressResultSection');
const compressResultTitle = document.getElementById('compressResultTitle');
const compressCodeDisplay = document.getElementById('compressCodeDisplay');
const compressCopyBtn = document.getElementById('compressCopyBtn');
const compressDownloadBtn = document.getElementById('compressDownloadBtn');

let currentCompressCode = '';

function compressHTML(html) {
    let result = html;
    result = result.replace(/<!--[\\s\\S]*?-->/g, '');
    result = result.replace(/[ \\t\\n\\r]+/g, ' ');
    result = result.replace(/>\\s+</g, '><');
    result = result.replace(/\\s*=\\s*/g, '=');
    result = result.trim();
    return result;
}

function decompressHTML(html) {
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'];
    const selfClosingElements = [...voidElements];
    const preserveContentTags = ['script', 'style', 'textarea', 'pre', 'code'];
    const indentSize = 2;
    let indent = 0;
    let result = '';
    let i = 0;
    const len = html.length;
    let inTag = false;
    let currentTag = '';
    let inQuotes = false;
    let quoteChar = '';
    let inPreserveContent = false;
    let preserveContentTagName = '';
    while (i < len) {
        const char = html[i];
        if (inPreserveContent) {
            currentTag += char;
            if (char === '<' && !inQuotes) {
                let lookahead = i + 1;
                let possibleCloseTag = '<';
                while (lookahead < len && html[lookahead] !== '>') {
                    possibleCloseTag += html[lookahead];
                    lookahead++;
                }
                if (lookahead < len) possibleCloseTag += '>';
                const closeTagMatch = possibleCloseTag.match(/^<\\/([a-zA-Z0-9-]+)/i);
                if (closeTagMatch && closeTagMatch[1].toLowerCase() === preserveContentTagName) {
                    inPreserveContent = false;
                }
            }
            i++;
            continue;
        }
        if (char === '<' && !inQuotes) {
            if (currentTag.trim()) {
                result += currentTag.trim();
                currentTag = '';
            }
            inTag = true;
            currentTag = char;
        } else if (char === '>' && !inQuotes) {
            currentTag += char;
            const tagContent = currentTag.trim();
            const isCloseTag = tagContent.startsWith('</');
            const tagNameMatch = tagContent.match(/^<\\/?([a-zA-Z0-9-]+)/i);
            const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
            const isSelfClosing = tagContent.endsWith('/>') || selfClosingElements.includes(tagName);
            if (isCloseTag) {
                indent = Math.max(0, indent - 1);
                if (result && !result.endsWith('\\n')) {
                    result += '\\n';
                }
                result += ' '.repeat(indent * indentSize);
            } else {
                if (result && !result.endsWith('\\n')) {
                    result += '\\n';
                }
                result += ' '.repeat(indent * indentSize);
            }
            result += tagContent;
            if (!isCloseTag && !isSelfClosing && tagName) {
                indent++;
                if (preserveContentTags.includes(tagName)) {
                    inPreserveContent = true;
                    preserveContentTagName = tagName;
                }
            }
            currentTag = '';
            inTag = false;
        } else if ((char === '"' || char === "'") && inTag) {
            if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            } else if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            }
            currentTag += char;
        } else if (!inTag && (char === ' ' || char === '\\t' || char === '\\n' || char === '\\r')) {
            if (currentTag.trim()) {
                if (result && !result.endsWith('\\n')) {
                    result += '\\n';
                }
                result += ' '.repeat(indent * indentSize);
                result += currentTag.trim();
                currentTag = '';
            }
        } else {
            currentTag += char;
        }
        i++;
    }
    if (currentTag.trim()) {
        if (result && !result.endsWith('\\n')) {
            result += '\\n';
        }
        result += ' '.repeat(indent * indentSize);
        result += currentTag.trim();
    }
    return result;
}

compressBtn.addEventListener('click', () => {
    const html = htmlInput.value.trim();
    if (!html) {
        alert('请输入 HTML 代码');
        return;
    }
    currentCompressCode = compressHTML(html);
    compressResultTitle.textContent = '压缩结果 (' + (currentCompressCode.length) + ' 字符)';
    compressCodeDisplay.textContent = currentCompressCode;
    compressResultSection.style.display = 'block';
});

decompressBtn.addEventListener('click', () => {
    const html = htmlInput.value.trim();
    if (!html) {
        alert('请输入 HTML 代码');
        return;
    }
    currentCompressCode = decompressHTML(html);
    compressResultTitle.textContent = '格式化结果';
    compressCodeDisplay.textContent = currentCompressCode;
    compressResultSection.style.display = 'block';
});

clearBtn.addEventListener('click', () => {
    htmlInput.value = '';
    compressResultSection.style.display = 'none';
    currentCompressCode = '';
});

compressCopyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(currentCompressCode);
        compressCopyBtn.textContent = '✅ 已复制';
        setTimeout(() => compressCopyBtn.textContent = '📋 复制', 2000);
    } catch (err) {
        alert('复制失败');
    }
});

compressDownloadBtn.addEventListener('click', () => {
    const blob = new Blob([currentCompressCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
</script>
</body>
</html>
  `;
}
