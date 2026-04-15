export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/') {
      return this.renderForm();
    }
    
    if (url.pathname === '/fetch' && request.method === 'POST') {
      const formData = await request.formData();
      const targetUrl = formData.get('url');
      
      if (!targetUrl) {
        return new Response('请输入网址', { status: 400 });
      }
      
      return this.fetchWebsite(targetUrl);
    }
    
    if (url.pathname === '/proxy' && request.method === 'POST') {
      const formData = await request.formData();
      const resourceUrl = formData.get('url');
      
      if (!resourceUrl) {
        return new Response('请输入资源地址', { status: 400 });
      }
      
      return this.proxyResource(resourceUrl);
    }
    
    return new Response('未找到', { status: 404 });
  },
  
  renderForm() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZQ-HtmlCode - 网站源代码获取器</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg t='1776166203734' class='icon' viewBox='0 0 1024 1024' version='1.1' xmlns='http://www.w3.org/2000/svg' p-id='6362'%3E%3Cpath d='M0 0h1024v1024H0z' fill='%23D8D8D8' fill-opacity='0' p-id='6363'%3E%3C/path%3E%3Cpath d='M51.2 56.889h921.6c28.274 0 51.2 22.642 51.2 50.574V916.48c0 27.932-22.926 50.574-51.2 50.574H51.2A50.859 50.859 0 0 1 0 916.48V107.52c0-27.99 22.926-50.631 51.2-50.631z m51.2 101.148v707.926h819.2V158.037H102.4z' fill='%231296db' p-id='6364'%3E%3C/path%3E%3Cpath d='M645.29 284.444L477.07 739.556h-98.418L546.93 284.444h98.418z m73.046 66.617L881.778 512 718.336 672.939l-65.365-64.399L751.047 512l-98.076-96.54 65.365-64.399z m-412.672 0l65.365 64.455L272.953 512l98.076 96.54-65.365 64.399L142.222 512l163.442-160.939z' fill='%23298DF8' p-id='6365'%3E%3C/path%3E%3C/svg%3E" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
      width: 100%;
      max-width: 950px;
      overflow: hidden;
    }
    .header {
      background: #1296db;
      color: white;
      padding: 30px 24px;
      text-align: center;
      position: relative;
    }
    .github-link {
      position: absolute;
      top: 16px;
      right: 16px;
      color: white;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0.9;
      transition: opacity 0.3s, transform 0.3s;
    }
    .github-link:hover {
      opacity: 1;
      transform: scale(1.05);
    }
    .github-link svg {
      width: 24px;
      height: 24px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header p {
      opacity: 0.95;
      font-size: 14px;
    }
    .tab-container {
      display: flex;
      border-bottom: 1px solid #e5e7eb;
    }
    .tab {
      flex: 1;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      border: none;
      font-size: 15px;
      font-weight: 500;
      color: #64748b;
      transition: background 0.2s, color 0.2s;
    }
    .tab:hover {
      background: #e2e8f0;
    }
    .tab.active {
      background: white;
      color: #1296db;
      font-weight: 600;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .form-section {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      background: #f8fafc;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    input[type="url"],
    textarea {
      width: 100%;
      padding: 14px 18px;
      font-size: 16px;
      border: 2px solid #d1d5db;
      border-radius: 12px;
      outline: none;
      transition: border-color 0.3s, box-shadow 0.3s;
      background: white;
      font-family: 'Courier New', Courier, monospace;
    }
    textarea {
      min-height: 200px;
      resize: vertical;
    }
    input[type="url"]:focus,
    textarea:focus {
      border-color: #1296db;
      box-shadow: 0 0 0 4px rgba(18, 150, 219, 0.15);
    }
    button {
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      background: #1296db;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, background 0.3s;
      width: 100%;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(18, 150, 219, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .button-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .button-group button {
      flex: 1;
      min-width: 120px;
    }
    .result-section {
      padding: 24px;
    }
    .result-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    .result-header h2 {
      font-size: 18px;
      color: #1f2937;
      font-weight: 600;
      word-break: break-all;
    }
    .actions {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    .actions button {
      flex: 1;
      padding: 10px 16px;
      font-size: 14px;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 18px;
      border-radius: 12px;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.6;
      border: 1px solid #1e293b;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 16px;
      border-radius: 12px;
      border-left: 5px solid #dc2626;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }
    .spinner {
      border: 3px solid #e2e8f0;
      border-top: 3px solid #1296db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .info {
      background: #e0f2fe;
      color: #0369a1;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .progress-container {
      background: #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #1296db 0%, #298DF8 100%);
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 14px;
      color: #475569;
    }
    .resource-list {
      max-height: 300px;
      overflow-y: auto;
      background: #f1f5f9;
      border-radius: 12px;
      padding: 12px;
    }
    .resource-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      margin-bottom: 4px;
      background: white;
      border-radius: 8px;
      font-size: 13px;
      word-break: break-all;
    }
    .resource-item.success {
      border-left: 4px solid #10b981;
    }
    .resource-item.error {
      border-left: 4px solid #dc2626;
    }
    .resource-icon {
      margin-right: 10px;
      font-size: 16px;
    }
    
    /* 响应式设计 */
    @media (min-width: 768px) {
      body {
        padding: 20px;
      }
      .header {
        padding: 35px 30px;
      }
      .github-link {
        top: 20px;
        right: 20px;
      }
      .github-link svg {
        width: 28px;
        height: 28px;
      }
      .header h1 {
        font-size: 32px;
        margin-bottom: 10px;
      }
      .form-section {
        padding: 35px;
      }
      .form-group {
        flex-direction: row;
        gap: 14px;
      }
      input[type="url"] {
        flex: 1;
      }
      button {
        width: auto;
        padding: 16px 36px;
      }
      .result-section {
        padding: 35px;
      }
      .result-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 0;
      }
      .actions button {
        padding: 10px 18px;
      }
      pre {
        padding: 24px;
        max-height: 520px;
        font-size: 13px;
        line-height: 1.7;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://github.com/bayueqi/zq-htmlcode" target="_blank" class="github-link" title="GitHub">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
      <h1>ZQ-HtmlCode</h1>
      <p>网站源代码获取器与 HTML 压缩解压工具</p>
    </div>
    
    <div class="tab-container">
      <button class="tab active" data-tab="fetch">获取源码</button>
      <button class="tab" data-tab="compress">压缩/解压</button>
    </div>
    
    <div id="fetchTab" class="tab-content active">
      <div class="form-section">
        <form id="fetchForm">
          <div class="form-group">
            <input type="url" id="urlInput" placeholder="请输入网址，例如：https://example.com" required>
            <button type="submit" id="submitBtn">获取源代码</button>
          </div>
        </form>
      </div>
      <div class="result-section" id="resultSection" style="display: none;">
        <div class="result-header">
          <h2 id="resultTitle">源代码</h2>
          <div class="actions">
            <button type="button" id="copyBtn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">📋 复制</button>
            <button type="button" id="downloadHtmlBtn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">💾 下载HTML</button>
            <button type="button" id="downloadAllBtn" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">📦 下载全部资源</button>
          </div>
        </div>
        <div id="progressSection" style="display: none;">
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
            <div class="progress-text" id="progressText">准备下载...</div>
          </div>
          <div class="resource-list" id="resourceList"></div>
        </div>
        <pre id="codeDisplay"></pre>
      </div>
    </div>
    
    <div id="compressTab" class="tab-content">
      <div class="form-section">
        <div class="form-group" style="flex-direction: column;">
          <textarea id="htmlInput" placeholder="在此输入或粘贴 HTML 代码..."></textarea>
          <div class="button-group">
            <button type="button" id="compressBtn" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">📦 压缩 HTML</button>
            <button type="button" id="decompressBtn" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">✨ 解压/格式化</button>
            <button type="button" id="clearBtn" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">🗑️ 清空</button>
          </div>
        </div>
      </div>
      <div class="result-section" id="compressResultSection" style="display: none;">
        <div class="result-header">
          <h2 id="compressResultTitle">结果</h2>
          <div class="actions">
            <button type="button" id="compressCopyBtn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">📋 复制</button>
            <button type="button" id="compressDownloadBtn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">💾 下载</button>
          </div>
        </div>
        <pre id="compressCodeDisplay"></pre>
      </div>
    </div>
  </div>

  <script>
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(targetTab + 'Tab').classList.add('active');
      });
    });
    
    const form = document.getElementById('fetchForm');
    const urlInput = document.getElementById('urlInput');
    const submitBtn = document.getElementById('submitBtn');
    const resultSection = document.getElementById('resultSection');
    const resultTitle = document.getElementById('resultTitle');
    const codeDisplay = document.getElementById('codeDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resourceList = document.getElementById('resourceList');
    
    let currentCode = '';
    let currentUrl = '';
    let currentResources = [];
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      let targetUrl = urlInput.value.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = '获取中...';
      resultSection.style.display = 'block';
      resultTitle.textContent = '正在获取...';
      codeDisplay.innerHTML = '<div class="loading"><div class="spinner"></div>请稍候...</div>';
      progressSection.style.display = 'none';
      
      try {
        const formData = new FormData();
        formData.append('url', targetUrl);
        
        const response = await fetch('/fetch', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          currentCode = result.code;
          currentUrl = targetUrl;
          currentResources = result.resources || [];
          resultTitle.textContent = '网站源码 (' + currentResources.length + ' 个资源)';
          codeDisplay.textContent = currentCode;
          copyBtn.style.display = 'inline-block';
          downloadHtmlBtn.style.display = 'inline-block';
          downloadAllBtn.style.display = 'inline-block';
        } else {
          resultTitle.textContent = '获取失败';
          codeDisplay.innerHTML = '<div class="error">' + result.error + '</div>';
          copyBtn.style.display = 'none';
          downloadHtmlBtn.style.display = 'none';
          downloadAllBtn.style.display = 'none';
        }
      } catch (err) {
        resultTitle.textContent = '错误';
        codeDisplay.innerHTML = '<div class="error">请求失败: ' + err.message + '</div>';
        copyBtn.style.display = 'none';
        downloadHtmlBtn.style.display = 'none';
        downloadAllBtn.style.display = 'none';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '获取源代码';
      }
    });
    
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentCode);
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => {
          copyBtn.textContent = '📋 复制';
        }, 2000);
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
        listItem.className = 'resource-item';
        listItem.innerHTML = '<span class="resource-icon">⏳</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
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
            
            listItem.className = 'resource-item success';
            listItem.innerHTML = '<span class="resource-icon">✅</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
          } else {
            listItem.className = 'resource-item error';
            listItem.innerHTML = '<span class="resource-icon">❌</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
          }
        } catch (err) {
          listItem.className = 'resource-item error';
          listItem.innerHTML = '<span class="resource-icon">❌</span><span>' + resource.url.substring(0, 60) + (resource.url.length > 60 ? '...' : '') + '</span>';
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
      result = result.replace(/\\s+/g, ' ');
      result = result.replace(/>\\s+</g, '><');
      result = result.replace(/\\s*=\\s*/g, '=');
      result = result.trim();
      
      return result;
    }
    
    function decompressHTML(html) {
      let result = html;
      let indent = 0;
      const indentSize = 2;
      
      result = result.replace(/\\s+/g, ' ');
      result = result.replace(/>\\s+</g, '>\\n<');
      
      const lines = result.split('\\n');
      const formattedLines = [];
      
      const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'];
      
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        const isCloseTag = /^<\\//.test(line);
        const isSelfClosing = /\\/>$/.test(line) || voidElements.some(el => new RegExp('^<' + el, 'i').test(line));
        
        if (isCloseTag) {
          indent = Math.max(0, indent - 1);
        }
        
        formattedLines.push(' '.repeat(indent * indentSize) + line);
        
        if (!isCloseTag && !isSelfClosing && /^<[^\\/!][^>]*[^\\/]>$/.test(line)) {
          const tagName = line.match(/^<([a-zA-Z0-9-]+)/);
          if (tagName && !voidElements.includes(tagName[1].toLowerCase())) {
            indent++;
          }
        }
      }
      
      return formattedLines.join('\\n');
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
        setTimeout(() => {
          compressCopyBtn.textContent = '📋 复制';
        }, 2000);
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
</html>`;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  },
  
  async fetchWebsite(targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const code = await response.text();
      const resources = this.extractResources(code, targetUrl);
      
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
  },
  
  extractResources(html, baseUrl) {
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
          urlsToProcess = this.parseSrcset(match[1]);
        }
        
        for (const originalUrl of urlsToProcess) {
          const cleanedUrl = this.cleanUrl(originalUrl);
          
          if (!this.isValidResourceUrl(cleanedUrl)) continue;
          
          try {
            const fullUrl = new URL(cleanedUrl, baseUrl).href;
            
            if (seenUrls.has(fullUrl)) continue;
            seenUrls.add(fullUrl);
            
            if (!this.isValidExtension(fullUrl)) continue;
            
            const path = this.getResourcePath(fullUrl, baseUrlObj, cleanedUrl);
            
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
  },
  
  cleanUrl(url) {
    return url.trim().split(/[?#]/)[0];
  },
  
  isValidResourceUrl(url) {
    if (!url) return false;
    if (url.startsWith('data:')) return false;
    if (url.startsWith('#')) return false;
    if (url.startsWith('javascript:')) return false;
    if (url.startsWith('mailto:')) return false;
    if (url.startsWith('tel:')) return false;
    if (url.startsWith('about:')) return false;
    if (url.startsWith('blob:')) return false;
    return true;
  },
  
  isValidExtension(url) {
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
  },
  
  parseSrcset(srcset) {
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
  },
  
  getResourcePath(url, baseUrlObj, originalUrl) {
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
  },
  
  async proxyResource(resourceUrl) {
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
};
