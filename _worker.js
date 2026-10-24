/* ========================================================================== *
 *  ZQ-HtmlIco — Cloudflare Worker 单文件版
 *
 *  分区索引：
 *    一、配置与入口        常量、默认密码、路由分发
 *    二、登录与登录页      密码校验、登录页 HTML
 *    三、图标接口          POST /api/favicon、GET /<密码>/<域名>
 *    四、图标抓取          取首页 → 建候选 → 取字节 → 校验，ICO 解出 PNG
 *    五、HTML 解析与图片工具
 *    六、网页资源抓取      整站 HTML + 资源代理
 *    七、前端页面          面板的 HTML/CSS/JS
 * ========================================================================== */

/* ---------- 一、配置与入口 ---------- */

const DEFAULT_PASSWORD = 'zq-htmlico';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// 首页被拦时换手机 UA 重试：一部分站只放行移动端 UA
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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
  const isLoggedIn = await checkLoginStatus(request);

  // 登录
  if (url.pathname === '/login' && request.method === 'POST') {
    return handleLoginRequest(request, PASSWORD);
  }

  // 图标 API（JSON）。未登录也能用，只要 body 里带 password。
  // 注意：body 只能读一次，所以在这里读完把 url 传下去，别让下游再读 request。
  if (url.pathname === '/api/favicon') {
    const body = await request.json().catch(() => ({}));
    if (!isLoggedIn && body.password !== PASSWORD) {
      return jsonResponse({ error: '需要密码验证' }, 401);
    }
    return handleFaviconRequest(body.url);
  }

  // 简单图标 API：/<密码>/<域名>，直接返回图片字节
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length === 2) {
    if (parts[0] !== PASSWORD) return jsonResponse({ error: '密码错误' }, 401);
    return handleSimpleFaviconRequest(parts[1]);
  }

  // 整站 HTML 抓取
  if (url.pathname === '/fetch' && request.method === 'POST') {
    if (!isLoggedIn) return jsonResponse({ error: '需要密码验证' }, 401);
    const formData = await request.formData();
    const targetUrl = formData.get('url');
    if (!targetUrl) return new Response('请输入网址', { status: 400 });
    return fetchWebsite(targetUrl);
  }

  // 单个资源代理
  if (url.pathname === '/proxy' && request.method === 'POST') {
    if (!isLoggedIn) return new Response('需要密码验证', { status: 401 });
    const formData = await request.formData();
    const resourceUrl = formData.get('url');
    if (!resourceUrl) return new Response('请输入资源地址', { status: 400 });
    return proxyResource(resourceUrl);
  }

  const page = isLoggedIn ? getFrontendHTML(PASSWORD) : getLoginHTML(PASSWORD);
  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/* ---------- 二、登录与登录页 ---------- */

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
    <link rel="icon" href="https://img.520jk.cc.cd/i/2026/10/18/724161.png" type="image/png">
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

/* ========================================================================== *
 *  三、图标接口
 * ========================================================================== */

// 用户可能只输入 example.com，补协议后统一成 URL
function normalizeTargetUrl(input) {
  const s = String(input == null ? '' : input).trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}

// 两个图标接口共用：规范化 → 找图标
async function resolveFavicon(targetUrl) {
  const parsed = new URL(targetUrl);
  const found = await findFavicon(parsed.origin, parsed.pathname);
  return { parsed, found };
}

// POST /api/favicon：返回 JSON（title / description / 多尺寸 data URI）
async function handleFaviconRequest(inputUrl) {
  try {
    const targetUrl = normalizeTargetUrl(inputUrl);
    if (!targetUrl) return jsonResponse({ error: 'URL is required' }, 400);

    const { parsed, found } = await resolveFavicon(targetUrl);
    if (!found.url) {
      return jsonResponse({ error: '无法获取网站图标', tried: found.tried.slice(0, 40) }, 404);
    }
    return jsonResponse({
      title: found.title || parsed.hostname,
      description: found.description || '',
      url: targetUrl,
      faviconUrl: found.url,
      favicons: await generateFaviconSizes(found.data, found.contentType)
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// GET /<密码>/<域名>：直接吐图片字节
async function handleSimpleFaviconRequest(targetUrl) {
  try {
    const { found } = await resolveFavicon(normalizeTargetUrl(targetUrl));
    if (!found.url) return jsonResponse({ error: '无法获取网站图标' }, 404);
    return new Response(found.data, {
      headers: { 'Content-Type': found.contentType || 'image/x-icon' }
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/* ========================================================================== *
 *  四、图标抓取
 *      fetchHomePage · buildCandidates · loadCandidate · acceptIcon · findFavicon
 * ========================================================================== */

// 兜底路径：绝大多数站点的图标就在这几个位置
const COMMON_ICON_PATHS = [
  '/favicon.ico', '/favicon.png', '/favicon.svg',
  '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png',
  '/apple-touch-icon-180x180.png', '/apple-touch-icon-152x152.png',
  '/favicon-32x32.png', '/favicon-16x16.png', '/favicon-48x48.png',
  '/android-chrome-192x192.png', '/android-chrome-512x512.png', '/android-chrome-96x96.png',
  '/mstile-150x150.png',
  '/static/favicon.ico', '/static/favicon.png',
  '/assets/favicon.ico', '/assets/favicon.png',
  '/img/favicon.ico', '/img/favicon.png', '/images/favicon.ico'
];

// 少数站点图标不在自己域名下，只能用固定地址
const SITE_ICON_OVERRIDES = [
  [/github\.com$/, 'https://github.githubassets.com/favicon.ico'],
  [/google\./, 'https://www.google.com/favicon.ico'],
  [/(twitter|x)\.com$/, 'https://abs.twimg.com/favicons/twitter.ico'],
  [/facebook\.com$/, 'https://www.facebook.com/favicon.ico'],
  [/instagram\.com$/, 'https://www.instagram.com/favicon.ico'],
  [/youtube\.com$/, 'https://www.youtube.com/s/desktop/favicon.ico']
];

// 公共服务兜底：自己拿不到时最后试，能绕过一部分反爬
function publicIconApis(hostname) {
  return [
    'https://icons.duckduckgo.com/ip3/' + hostname + '.ico',
    'https://www.google.com/s2/favicons?domain=' + hostname + '&sz=256',
    'https://www.google.com/s2/favicons?domain=' + hostname + '&sz=64'
  ];
}

// 文本类响应（软 404、反爬页、旧缓存）：魔数认不出图片就说明不是图标
function isTextResponse(contentType) {
  return /text\/|application\/(json|xhtml)/.test(contentType || '');
}

// data URI 太长，日志里只留开头
function labelOf(candidate) {
  return candidate.startsWith('data:') ? candidate.slice(0, 32) + '...' : candidate;
}

// 首页 HTML：顺路拿 title / description；被 UA 拦时换个手机 UA 再来一次
async function fetchHomePage(domain, tried) {
  const info = { html: '', title: '', description: '' };
  let res = null;
  try {
    res = await fetch(domain, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }
    });
    // 有些站按 UA 拦数据中心 IP：桌面 Chrome UA 被 403/429，换手机 UA 就放行
    if (res.status === 403 || res.status === 429) {
      const retry = await fetch(domain, {
        headers: { 'User-Agent': MOBILE_UA, 'Accept': 'text/html,application/xhtml+xml' },
        redirect: 'follow'
      }).catch(() => null);
      if (retry && retry.ok) res = retry;
    }
  } catch (e) {
    tried.push(domain + ' → 首页请求失败：' + (e && e.message ? e.message : e));
    return info;
  }

  // 不能因为状态码不是 2xx 就放弃：登录页、错误页常常也是完整 HTML，图标就写在里面。
  // 典型情况是站点 / 302 到需要登录的页面并返回 401，此时 <link rel="icon"> 依然存在。
  try {
    info.html = await res.text();
  } catch (e) {
    tried.push(domain + ' → 首页读取失败：' + (e && e.message ? e.message : e));
    return info;
  }
  if (!res.ok) {
    if (/<head|<link|<meta|<html/i.test(info.html)) {
      tried.push(domain + ' → 首页 HTTP ' + res.status + '，但返回的是 HTML，继续解析图标');
    } else {
      tried.push(domain + ' → 首页 HTTP ' + res.status + '，且不是 HTML');
      info.html = '';
      return info;
    }
  }
  info.title = extractTitleFromHTML(info.html);
  info.description = extractDescriptionFromHTML(info.html);
  return info;
}

// 候选清单：页面声明 → manifest → 常见路径 → 子目录 → 内联 data: → 站点特判 → 公共服务
async function buildCandidates(ctx) {
  const { domain, hostname, startPath, pageHtml, declared, tried } = ctx;
  const list = declared.slice();

  // 页面没写图标、只挂了 manifest 的站点：去 manifest 里拿 icons[]
  if (!declared.length && pageHtml) {
    const manifestUrl = extractManifestUrl(pageHtml, domain);
    if (manifestUrl) {
      const icons = await fetchManifestIcons(manifestUrl);
      if (icons.length) {
        tried.push(manifestUrl + ' → manifest 里取到 ' + icons.length + ' 个图标');
        list.push(...icons);
      }
    }
  }

  for (const p of COMMON_ICON_PATHS) list.push(new URL(p, domain).href);

  // 站点挂在子目录时（如 https://host/app/），图标常摆在同一目录下
  const dir = (startPath || '/').replace(/[^/]*$/, '');
  if (dir && dir !== '/') {
    for (const p of ['favicon.ico', 'favicon.svg', 'favicon.png']) {
      list.push(new URL(dir + p, domain).href);
    }
  }

  // HTML 里内联的 data: 图标：放在常见路径之后，属性引号嵌套写坏时也能兜到
  if (pageHtml) list.push(...extractInlineDataIcons(pageHtml));

  for (const [re, url] of SITE_ICON_OVERRIDES) {
    if (re.test(hostname)) { list.push(url); break; }
  }

  list.push(...publicIconApis(hostname));

  // 去重，保留顺序
  const seen = new Set();
  const unique = [];
  for (const c of list) {
    if (c && !seen.has(c)) { seen.add(c); unique.push(c); }
  }
  return unique;
}

// 取单个候选的字节。data URI 直接解；外链带 Referer 应对防盗链；命中旧缓存时加参数重取
async function loadCandidate(candidate, ctx, tried) {
  const label = labelOf(candidate);

  if (candidate.startsWith('data:')) {
    const parsed = decodeDataUri(candidate);
    if (!parsed) { tried.push(label + ' → data URI 解码失败'); return null; }
    return { buf: parsed.data, contentType: parsed.mime };
  }

  const headers = { 'User-Agent': UA, 'Accept': 'image/*,image/webp,*/*;q=0.8' };
  let crossOrigin = false;
  try {
    crossOrigin = new URL(candidate).hostname !== ctx.hostname;
    if (crossOrigin) headers['Referer'] = ctx.domain + '/';
  } catch (e) {}

  let res = await fetch(candidate, { headers, redirect: 'follow' });
  // 图床普遍做防盗链，但也有反过来只认裸请求的，去掉 Referer 再试一次
  if (!res.ok && crossOrigin && headers['Referer']) {
    delete headers['Referer'];
    res = await fetch(candidate, { headers, redirect: 'follow' });
  }
  if (!res.ok) { tried.push(label + ' → HTTP ' + res.status); return null; }

  let contentType = (res.headers.get('content-type') || '').toLowerCase();
  let buf = await res.arrayBuffer();

  // 站点刚补上图标路由时，CDN 里可能还存着旧的 HTML（.ico/.png/.svg 都在默认可缓存后缀里），
  // 而服务端请求照样读缓存 → 所有图标路径都回 HTML。加一次性参数换掉缓存键再要一次。
  if (isTextResponse(contentType) && !sniffImageType(buf)) {
    const bustUrl = candidate + (candidate.includes('?') ? '&' : '?') + '_zq=' + Date.now();
    try {
      const res2 = await fetch(bustUrl, { headers, redirect: 'follow' });
      if (res2.ok) {
        const ct2 = (res2.headers.get('content-type') || '').toLowerCase();
        const buf2 = await res2.arrayBuffer();
        if (buf2 && buf2.byteLength >= 4 && (sniffImageType(buf2) || /image\/|icon/.test(ct2))) {
          tried.push(label + ' → 原始请求命中 CDN 旧缓存（' + contentType + '），加参数重取成功');
          buf = buf2;
          contentType = ct2;
        }
      }
    } catch (e) {}
  }

  return { buf, contentType };
}

// 校验字节确实是图标；ICO 顺手解出内嵌 PNG（Safari / WebView 的 <img> 不认 ICO）
function acceptIcon(buf, contentType, tried, label) {
  if (!buf || buf.byteLength < 4) { tried.push(label + ' → 内容为空'); return null; }

  const sniffed = sniffImageType(buf);
  // 明确是文本/HTML/JSON（软 404 或反爬页）且魔数认不出图片 → 跳过
  if (isTextResponse(contentType) && !sniffed) {
    tried.push(label + ' → 返回的是文本/HTML（' + contentType + '）');
    return null;
  }
  // 有 content-type 但不是图片、魔数也认不出 → 跳过
  if (contentType && !/image\/|icon/.test(contentType) && !sniffed) {
    tried.push(label + ' → content-type 不是图片（' + contentType + '）');
    return null;
  }
  // SVG 必须完整：属性里带引号时 data URI 可能被截断，半截 SVG 会渲染成空白
  if ((sniffed || contentType).includes('svg')) {
    const txt = new TextDecoder().decode(buf).trim();
    if (!/<\/svg>$/i.test(txt)) {
      tried.push(label + ' → SVG 不完整（被截断）');
      return null;
    }
  }

  let data = buf;
  let type = sniffed || (contentType.includes('svg') ? 'image/svg+xml' : 'image/x-icon');
  if (type === 'image/x-icon') {
    const png = largestPngInIco(buf);
    if (png) {
      data = png;
      type = 'image/png';
      tried.push(label + ' → 已把 ICO 内的 PNG 帧解出（' + png.byteLength + ' 字节）');
    }
  }
  return { data, type };
}

// 主流程：跑完候选清单，第一个通过校验的就是结果
async function findFavicon(domain, startPath) {
  const hostname = new URL(domain).hostname;
  const out = { url: null, data: null, contentType: null, title: '', description: '', tried: [] };
  const ctx = { domain, hostname, startPath };

  const page = await fetchHomePage(domain, out.tried);
  out.title = page.title;
  out.description = page.description;

  const declared = page.html ? extractAllFaviconsFromHTML(page.html, domain) : [];
  const candidates = await buildCandidates({
    domain, hostname, startPath, pageHtml: page.html, declared, tried: out.tried
  });

  for (const candidate of candidates) {
    try {
      const loaded = await loadCandidate(candidate, ctx, out.tried);
      if (!loaded) continue;

      const icon = acceptIcon(loaded.buf, loaded.contentType, out.tried, labelOf(candidate));
      if (!icon) continue;

      out.url = candidate;
      out.data = icon.data;
      out.contentType = icon.type;
      return out;
    } catch (e) {
      out.tried.push(labelOf(candidate) + ' → 异常：' + (e && e.message ? e.message : e));
    }
  }

  return out;
}

/* ========================================================================== *
 *  五、HTML 解析与图片工具
 * ========================================================================== */

function extractTitleFromHTML(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractDescriptionFromHTML(html) {
  const match = html.match(/<meta[^>]+name=["']?description["']?[^>]+content=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

// 取属性值：先按双引号包裹取（内部允许单引号），再退到单引号包裹（内部允许双引号），
// 最后兜住不写引号的写法（href=/favicon.ico）——以前这种直接漏掉。
// 用 [^"']+ 会在 data URI 里的单引号（如 font-family 的 'Segoe UI'）处截断
function attrValue(tag, namePattern) {
  const dq = tag.match(new RegExp('(?:' + namePattern + ')\\s*=\\s*"([^"]*)"', 'i'));
  if (dq) return dq[1];
  const sq = tag.match(new RegExp("(?:" + namePattern + ")\\s*=\\s*'([^']*)'", 'i'));
  if (sq) return sq[1];
  const bare = tag.match(new RegExp('(?:' + namePattern + ')\\s*=\\s*([^\\s"\'`=<>]+)', 'i'));
  if (bare) return bare[1];
  return '';
}

// <base href>：页面声明了基地址时，相对图标要按它解析，否则会拼到站点根上
function baseHrefOf(html) {
  const m = html.match(/<base\b(?:"[^"]*"|'[^']*'|[^>"'])*>/i);
  if (!m) return '';
  return attrValue(m[0], 'href');
}

// sizes="16x16 32x32" / "any" → 最大边长，用来优先挑大图标
function maxSizeOf(tag) {
  const s = attrValue(tag, 'sizes');
  if (!s) return 0;
  let best = 0;
  const re = /(\d+)\s*[x×]\s*(\d+)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const v = Math.max(parseInt(m[1], 10) || 0, parseInt(m[2], 10) || 0);
    if (v > best) best = v;
  }
  if (!best && /any/i.test(s)) best = 512;
  return best;
}

// 解析 HTML 里声明的图标：不依赖属性顺序，覆盖 icon/apple-touch-icon/mask-icon/manifest
// 标签用「引号感知」的写法：data: URI 的 SVG 里带 '>'，[^>]* 会在那里提前截断
function extractAllFaviconsFromHTML(html, baseUrl) {
  const found = [];
  const base = baseHrefOf(html);
  const resolveBase = base ? (resolveUrl(base, baseUrl) || baseUrl) : baseUrl;

  const linkRegex = /<link\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const tag = m[0];
    const href = attrValue(tag, 'href');
    if (!href) continue;
    const rel = attrValue(tag, 'rel').toLowerCase();
    // manifest 单独处理（要再请求一次拿里面的 icons），这里跳过
    if (/manifest/.test(rel) && !/\bicon\b/.test(rel)) continue;
    if (/\bicon\b/.test(rel) || /apple-touch-icon/.test(rel) || /mask-icon/.test(rel)) {
      const full = href.startsWith('data:') ? href : resolveUrl(href, resolveBase);
      if (full) found.push({ url: full, size: maxSizeOf(tag) });
    }
  }

  // og:image / twitter:image / msapplication-TileImage 兜底
  const metaRegex = /<meta\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
  while ((m = metaRegex.exec(html)) !== null) {
    const tag = m[0];
    const prop = attrValue(tag, 'property|name').toLowerCase();
    if (prop !== 'og:image' && prop !== 'twitter:image' && prop !== 'msapplication-tileimage') continue;
    const content = attrValue(tag, 'content');
    if (content) {
      const full = content.startsWith('data:') ? content : resolveUrl(content, resolveBase);
      if (full) found.push({ url: full, size: 0 });
    }
  }

  // 声明了尺寸的大图优先：不少站点先写 16x16 再写 512x512，按顺序取会拿到最小的
  found.sort((a, b) => b.size - a.size);
  return found.map((x) => x.url);
}

// <link rel="manifest">：很多站点只在 manifest 里列图标
function extractManifestUrl(html, baseUrl) {
  const linkRegex = /<link\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const tag = m[0];
    if (!/\bmanifest\b/i.test(attrValue(tag, 'rel'))) continue;
    const href = attrValue(tag, 'href');
    if (!href) continue;
    const full = resolveUrl(href, baseUrl);
    if (full) return full;
  }
  return '';
}

// 读 manifest 的 icons[]，按尺寸从大到小返回图标地址
async function fetchManifestIcons(manifestUrl) {
  try {
    const res = await fetch(manifestUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/manifest+json,application/json' }
    });
    if (!res.ok) return [];
    const json = await res.json();
    const icons = Array.isArray(json && json.icons) ? json.icons : [];
    const list = [];
    for (const it of icons) {
      const src = it && it.src;
      if (!src) continue;
      const full = src.startsWith('data:') ? src : resolveUrl(src, manifestUrl);
      if (!full) continue;
      let size = 0;
      const sm = /(\d+)\s*[x×]\s*(\d+)/i.exec(String(it.sizes || ''));
      if (sm) size = Math.max(parseInt(sm[1], 10) || 0, parseInt(sm[2], 10) || 0);
      if (!size && /any/i.test(String(it.sizes || ''))) size = 512;
      list.push({ url: full, size });
    }
    list.sort((a, b) => b.size - a.size);
    return list.map((x) => x.url);
  } catch (e) {
    return [];
  }
}

// 直接在整页 HTML 里找内联 data: 图标，不依赖属性解析。
// 场景：href="data:image/svg+xml,<svg xmlns="http://...">"（双引号套双引号）这类写法，
// 标签解析会在第一个内层双引号处截断；这里按 SVG 的 </svg> 或 base64 的引号边界取完整 URI。
function extractInlineDataIcons(html) {
  const out = [];
  const re = /data:image\/(?:svg\+xml|x-icon|png|vnd\.microsoft\.icon)/gi;
  const lower = html.toLowerCase();
  let m;
  while ((m = re.exec(html)) !== null) {
    const start = m.index;
    const comma = html.indexOf(',', start);
    if (comma < 0) continue;
    const meta = html.slice(start + 5, comma).toLowerCase();
    let end;
    if (meta.includes('svg') && !meta.includes('base64')) {
      const close = lower.indexOf('</svg>', comma);
      if (close < 0) continue;
      end = close + 6;
    } else {
      let i = comma + 1;
      while (i < html.length && !/[\s"'`<>)]/.test(html[i])) i++;
      end = i;
    }
    const uri = html.slice(start, end);
    if (uri.length > 40) out.push(uri);
  }
  return out;
}

function resolveUrl(href, baseUrl) {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return 'https:' + href;
  try { return new URL(href, baseUrl).href; } catch (e) { return null; }
}

// 解码 data URI（data:image/svg+xml,%3Csvg... 或 data:image/png;base64,...），返回 {mime, data}
function decodeDataUri(uri) {
  const comma = uri.indexOf(',');
  if (comma < 0) return null;
  const meta = uri.slice(5, comma);
  const payload = uri.slice(comma + 1);
  let mime = 'text/plain';
  let isBase64 = false;
  for (const part of meta.split(';')) {
    if (part.includes('/')) mime = part;
    else if (part.toLowerCase() === 'base64') isBase64 = true;
  }
  try {
    if (isBase64) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { mime: mime.toLowerCase(), data: bytes.buffer };
    }
    // SVG 里常有裸 %（如渐变 offset='50%'），decodeURIComponent 会整体抛错，
    // 这种情况退回原始 payload，不要整条丢掉
    let text;
    try {
      text = decodeURIComponent(payload);
    } catch (e) {
      text = payload;
    }
    const bytes = new TextEncoder().encode(text);
    return { mime: mime.toLowerCase(), data: bytes.buffer };
  } catch (e) {
    return null;
  }
}

// 按魔数识别图片类型，避免把软 404 的 HTML 当图标；SVG 是文本需单独识别
function sniffImageType(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 4) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return 'image/x-icon';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  const head = new TextDecoder().decode(b.slice(0, 256)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}

// 从 ICO 容器里取出最大尺寸的内嵌 PNG 帧。
// 现代 favicon.ico 基本都是「PNG 封装」，而 Safari / 部分 WebView 的 <img> 不渲染 ICO，
// 抓到 ICO 直接塞 <img> 会显示空白，看着就像"没取到图标"。
function largestPngInIco(buf) {
  try {
    const b = new Uint8Array(buf);
    if (b.length < 6) return null;
    const count = b[4] | (b[5] << 8);
    if (count === 0 || count > 64) return null;
    let best = null;
    for (let i = 0; i < count; i++) {
      const p = 6 + i * 16;
      if (p + 16 > b.length) break;
      const w = b[p] === 0 ? 256 : b[p];
      const size = b[p + 8] | (b[p + 9] << 8) | (b[p + 10] << 16) | (b[p + 11] << 24);
      const off = b[p + 12] | (b[p + 13] << 8) | (b[p + 14] << 16) | (b[p + 15] << 24);
      if (size <= 8 || off + size > b.length) continue;
      // 只认 PNG 帧（BMP 帧不做转换，交给浏览器原生处理）
      if (!(b[off] === 0x89 && b[off + 1] === 0x50 && b[off + 2] === 0x4e && b[off + 3] === 0x47)) continue;
      if (!best || w > best.w) best = { w: w, off: off, size: size };
    }
    if (!best) return null;
    const slice = b.subarray(best.off, best.off + best.size);
    return slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
  } catch (e) {
    return null;
  }
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function generateFaviconSizes(iconData, mime) {
  const sizes = ['16', '32', '64', '128', '256'];
  const favicons = {};
  const dataUrl = 'data:' + (mime || 'image/x-icon') + ';base64,' + toBase64(iconData);
  for (const size of sizes) {
    favicons[size] = dataUrl;
  }
  return favicons;
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/* ========================================================================== *
 *  六、网页资源抓取
 * ========================================================================== */

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

/* ========================================================================== *
 *  七、前端页面
 * ========================================================================== */

function getFrontendHTML(PASSWORD) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>ZQ-HtmlIco</title>
    <link rel="icon" href="https://img.520jk.cc.cd/i/2026/10/18/724161.png" type="image/png">
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
                            type="text"
                            id="urlInput"
                            placeholder="example.com"
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
                <div class="simple-api-section">
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input type="text" id="simpleApiUrl" class="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm font-mono" readonly>
                        <button type="button" id="copyApiBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg whitespace-nowrap">📋 复制链接</button>
                    </div>
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
                        <input type="text" id="fetchUrlInput" placeholder="example.com" class="flex-1 px-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
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
            const err = new Error(errorData.error || '获取网站数据失败');
            err.tried = errorData.tried; // 服务端试过的地址与跳过原因
            throw err;
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError(error.message || "获取网站元数据失败", error.tried);
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

function showError(message, tried) {
    errorContainer.classList.remove('hidden');
    errorContainerMessage.textContent = message;
    resultsContainer.classList.add('hidden');

    var oldBox = document.getElementById('errorTried');
    if (oldBox) oldBox.remove();
    if (!tried || !tried.length) return;

    var box = document.createElement('details');
    box.id = 'errorTried';
    box.style.cssText = 'margin-top:10px;font-size:12px;line-height:1.6;color:#6b7280;max-height:200px;overflow:auto;';
    var sum = document.createElement('summary');
    sum.textContent = '诊断信息';
    sum.style.cssText = 'cursor:pointer;color:#4b5563;';
    box.appendChild(sum);
    var ul = document.createElement('ul');
    ul.style.cssText = 'margin:6px 0 0;padding-left:18px;text-align:left;';
    tried.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        li.style.cssText = 'word-break:break-all;margin-bottom:2px;';
        ul.appendChild(li);
    });
    box.appendChild(ul);
    errorContainer.appendChild(box);
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

    const hostname = new URL(data.url).hostname;
    const simpleApiUrl = window.location.origin + '/' + PASSWORD + '/' + hostname;
    const simpleApiInput = document.getElementById('simpleApiUrl');
    simpleApiInput.value = simpleApiUrl;

    document.getElementById('copyApiBtn').onclick = async () => {
        try {
            await navigator.clipboard.writeText(simpleApiUrl);
            const btn = document.getElementById('copyApiBtn');
            btn.textContent = '✅ 已复制';
            setTimeout(() => btn.textContent = '📋 复制链接', 2000);
        } catch (err) {
            simpleApiInput.select();
            document.execCommand('copy');
            const btn = document.getElementById('copyApiBtn');
            btn.textContent = '✅ 已复制';
            setTimeout(() => btn.textContent = '📋 复制链接', 2000);
        }
    };

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
