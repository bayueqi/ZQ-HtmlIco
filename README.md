# ZQ-HtmlIco

一个功能强大的 Favicon 获取和网站源代码工具，支持压缩/解压 HTML 代码。

## 功能特性

### 🎯 主要功能
- **Favicon 获取** - 从任何网站获取不同尺寸的 Favicon 图标
- **网站源代码** - 获取完整的网站源代码和资源
- **HTML 压缩/解压** - 优化和格式化 HTML 代码

### 🔧 技术特点
- **多尺寸 Favicon** - 支持 16×16、32×32、64×64、128×128、256×256 尺寸
- **智能资源提取** - 自动提取网站中的 CSS、JS、图片等资源
- **HTML 格式化** - 智能格式化 HTML 代码，保留 script/style 标签内容
- **密码保护** - 内置密码验证机制

## 快速开始

### 部署方法

1. **克隆仓库**
   ```bash
   git clone https://github.com/bayueqi/ZQ-HtmlIco.git
   cd ZQ-HtmlIco
   ```

2. **部署到 Cloudflare Workers**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Workers & Pages
   - 创建新的 Worker
   - 复制 `_worker.js` 的内容到 Worker 编辑器
   - 点击部署

3. **设置环境变量（可选）**
   - 在 Worker 设置中，进入「变量和机密」
   - 添加变量名：`PASSWORD`
   - 设置您想要的密码值
   - 如果不设置，默认密码为：`zq-htmlico`

4. **访问应用**
   - 部署成功后，访问 Worker URL
   - 使用您设置的密码登录（或使用默认密码）

## 使用指南

### 1. 获取 Favicon
- 在输入框中输入网站 URL（如 `https://example.com`）
- 点击「获取」按钮
- 系统会自动分析网站，提取 Favicon 图标
- 可下载不同尺寸的 PNG 格式 Favicon

### 2. 获取网站源代码
- 输入目标网站 URL
- 点击「获取源代码」按钮
- 查看完整源代码
- 可选择：
  - 复制代码
  - 下载 HTML 文件
  - 下载全部资源（ZIP 格式）

### 3. 压缩/解压 HTML
- 在文本框中输入或粘贴 HTML 代码
- 点击「压缩 HTML」按钮 - 移除空白和注释，减小文件大小
- 点击「解压/格式化」按钮 - 美化代码，提高可读性
- 可复制或下载处理后的代码

## 项目结构

```
ZQ-HtmlIco/
├── _worker.js          # 主 Worker 代码
├── 1.html             # 示例 HTML 文件
└── README.md          # 项目说明文档
```

## API 接口

### Favicon API
- **端点**: `/api/favicon`
- **方法**: POST
- **参数**: `{ "url": "https://example.com", "password": "zq-htmlico" }`
- **返回**: 包含 Favicon 信息的 JSON 对象

### 简单 Favicon API
- **端点**: `/{password}/{domain}`
- **示例**: `/zq-htmlico/example.com`
- **返回**: 直接返回 Favicon 图片

### 源代码 API
- **端点**: `/fetch`
- **方法**: POST
- **参数**: `{ "url": "https://example.com" }`
- **返回**: 包含源代码和资源信息的 JSON 对象

### 资源代理 API
- **端点**: `/proxy`
- **方法**: POST
- **参数**: `{ "url": "https://example.com/image.png" }`
- **返回**: 原始资源文件

## 安全说明

- 系统使用密码保护，默认密码为 `zq-htmlico`
- 请在部署前设置环境变量 `PASSWORD` 以增强安全性
- 密码可以通过 Cloudflare Workers 的环境变量设置，无需修改代码
- 如果不设置环境变量，将使用默认密码

## 浏览器兼容性

- 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）
- 响应式设计，适配桌面和移动设备

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系

- **GitHub**: [bayueqi/ZQ-HtmlIco](https://github.com/bayueqi/ZQ-HtmlIco)
