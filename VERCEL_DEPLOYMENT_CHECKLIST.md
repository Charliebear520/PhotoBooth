# Vercel 部署检查清单

## 🔧 已修复的问题

### 1. Vercel 配置文件修复

- ✅ 修复了 `vercel.json` 中的路由配置
- ✅ 更新了 API 构建路径从 `backend/app/main.py` 到 `api/main.py`
- ✅ 修复了前端路由配置

### 2. API 入口点修复

- ✅ 创建了正确的 `api/main.py` 入口点
- ✅ 添加了 Python 路径配置
- ✅ 创建了 `api/requirements.txt`

### 3. CORS 配置优化

- ✅ 更新了 CORS 设置以支持 Vercel 域名
- ✅ 临时允许所有域名（生产环境应更严格）

### 4. 错误处理和调试

- ✅ 添加了详细的日志记录
- ✅ 创建了调试端点 `/api/debug`
- ✅ 创建了测试端点 `/api/test-generate`

## 📋 部署前检查清单

### 环境变量设置

在 Vercel Dashboard 中确保设置了：

- [ ] `GEMINI_API_KEY` - 你的 Google Gemini API 密钥
- [ ] `STABILITY_API_KEY` - 你的 Stability AI API 密钥（可选）

### 部署步骤

1. **推送代码到 GitHub**

   ```bash
   git add .
   git commit -m "Fix Vercel deployment configuration"
   git push origin main
   ```

2. **在 Vercel Dashboard 中**：

   - 选择 "Other" 作为 Framework Preset
   - 确保环境变量已正确设置
   - 点击 "Deploy"

3. **测试部署**：
   - 访问 `https://your-app.vercel.app/api/health`
   - 访问 `https://your-app.vercel.app/api/debug`
   - 测试风格转换功能

## 🔍 故障排除

### 如果仍然出现 500 错误：

1. **检查 Vercel Function Logs**：

   - 进入 Vercel Dashboard
   - 点击你的项目
   - 进入 "Functions" 标签
   - 查看错误日志

2. **测试 API 端点**：

   ```bash
   # 测试健康检查
   curl https://your-app.vercel.app/api/health

   # 测试调试信息
   curl https://your-app.vercel.app/api/debug

   # 测试简单生成
   curl -X POST https://your-app.vercel.app/api/test-generate
   ```

3. **检查环境变量**：
   - 确保 `GEMINI_API_KEY` 已设置
   - 检查 API 密钥是否有效
   - 验证密钥长度是否正确

### 常见问题解决：

**问题**: API 返回 500 错误
**解决**: 检查 Vercel Function Logs，通常是环境变量或 API 密钥问题

**问题**: CORS 错误
**解决**: 已修复 CORS 配置，如果仍有问题，检查域名是否正确

**问题**: 路由不工作
**解决**: 确保 `vercel.json` 配置正确，API 路径指向 `api/main.py`

## 🚀 部署后验证

部署成功后，你应该能够：

1. ✅ 访问前端页面
2. ✅ 拍摄照片
3. ✅ 选择风格
4. ✅ 成功生成风格化图片

如果任何步骤失败，请检查 Vercel Function Logs 获取详细错误信息。
