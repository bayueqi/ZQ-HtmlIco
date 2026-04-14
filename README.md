# ZQ-UrlCode

一个功能强大的网站源代码获取器与 HTML 压缩解压工具，部署在 Cloudflare Workers 上，提供简洁易用的界面。

## 功能特性

### 1. 网站源代码获取
- 通过输入网址获取完整的网站 HTML 源代码
- 支持自动添加协议（http:// 或 https://）
- 显示源代码获取状态和错误信息
- 提供复制和下载功能

### 2. HTML 压缩与解压
- **压缩**：将 HTML 代码压缩为一行，移除注释和多余空白
- **解压/格式化**：将压缩的 HTML 代码恢复为格式化的可读形式
- 支持任意 HTML 代码的压缩和解压
- 提供复制和下载功能

### 3. 界面设计
- 蓝变色风格，现代简约
- 响应式设计，适配移动端和桌面端
- 标签页式布局，切换便捷
- 实时显示压缩结果和字符数

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **后端**：Cloudflare Workers
- **部署**：Cloudflare Workers 边缘计算平台

## 部署方法

### 1. 准备工作
- 拥有 Cloudflare 账号
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update/)

### 2. 部署步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/bayueqi/zq-urlcode.git
   cd zq-urlcode
   ```

2. **配置 Wrangler**
   ```bash
   wrangler init
   ```

3. **部署到 Cloudflare Workers**
   ```bash
   wrangler deploy
   ```

4. **访问应用**
   部署完成后，Wrangler 会提供一个 URL，通过该 URL 访问应用。

## 本地测试

1. **安装依赖**
   ```bash
   npm install
   ```

2. **本地运行**
   ```bash
   wrangler dev
   ```

3. **访问本地服务**
   打开浏览器访问 `http://localhost:8787`


## 注意事项

- 由于 Cloudflare Workers 的限制，获取大型网站可能会超时
- 部分网站可能会阻止通过 Workers 获取内容
- 压缩后的 HTML 代码可能会影响某些依赖于空格的 JavaScript 代码

## 贡献

欢迎提交 Issue 和 Pull Request！
