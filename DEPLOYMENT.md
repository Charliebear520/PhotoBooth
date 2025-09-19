# PhotoBooth Vercel 部署指南

## 部署架构

你的 PhotoBooth 应用将在 Vercel 上以以下方式部署：

- **前端**: 静态文件部署到 Vercel CDN
- **后端**: FastAPI 应用部署为 Vercel Serverless Functions
- **Framework Preset**: 选择 "Other" 或 "Vite"

## 部署步骤

### 1. 准备环境变量

**重要**: 环境变量需要在 Vercel Dashboard 中手动设置，不要在代码中硬编码 API 密钥。

在 Vercel Dashboard 中设置以下环境变量：

1. 进入你的项目设置
2. 点击 "Environment Variables" 标签
3. 添加以下变量：

```
GEMINI_API_KEY = your_actual_gemini_api_key_here
STABILITY_API_KEY = your_actual_stability_api_key_here (可选)
```

**注意**:

- 不要使用 `@` 符号前缀
- 直接输入你的实际 API 密钥值
- 确保选择正确的环境（Production, Preview, Development）

### 2. 部署到 Vercel

#### 方法一：通过 Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 在项目根目录登录
vercel login

# 部署
vercel

# 设置环境变量 (可选，推荐在Dashboard中设置)
vercel env add GEMINI_API_KEY
vercel env add STABILITY_API_KEY
```

#### 方法二：通过 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 Vercel Dashboard 中导入项目
3. 选择 "Other" 作为 Framework Preset
4. 设置环境变量
5. 部署

### 3. Vercel 配置说明

项目包含以下配置文件：

- `vercel.json`: 主配置文件，定义构建和路由规则
- `frontend/vercel.json`: 前端特定配置
- `api/main.py`: Vercel serverless function 入口点

### 4. 部署后的 URL 结构

- 前端: `https://your-app.vercel.app/`
- API: `https://your-app.vercel.app/api/health`
- 图片生成: `https://your-app.vercel.app/api/generate`
- 图片风格化: `https://your-app.vercel.app/api/stylize`

## 注意事项

1. **CORS 配置**: 已更新为支持 Vercel 域名
2. **API 超时**: Vercel serverless functions 有 10 秒超时限制，对于 AI 图片生成可能需要优化
3. **文件上传**: 支持图片上传和 base64 处理
4. **环境变量**: 确保在 Vercel Dashboard 中正确设置 API 密钥

## 故障排除

### 常见问题

1. **构建失败**: 检查 Node.js 和 Python 版本兼容性
2. **API 调用失败**: 验证环境变量是否正确设置
3. **CORS 错误**: 确认域名在允许列表中
4. **超时错误**: 考虑优化 AI API 调用或使用更快的模型

### 调试

- 查看 Vercel Function Logs
- 使用 `/api/health` 端点测试 API 状态
- 检查浏览器开发者工具的网络请求

## 性能优化建议

1. 使用 CDN 缓存静态资源
2. 优化图片大小和格式
3. 考虑使用 Vercel Edge Functions 减少延迟
4. 实施 API 响应缓存策略
