# PhotoBooth

一個以 React + Vite（前端）與 FastAPI（後端）打造的圖片風格生成/轉換示範。後端代理呼叫 Google Gemini Imagen 介面以生成圖片。

參考文件： [Google Gemini API - 使用 Imagen 生成圖片](https://ai.google.dev/gemini-api/docs/imagen?hl=zh-tw)

## 需求

- Python 3.10~3.12
- Node.js 18+

## 安裝與啟動

### 後端（預設使用 venv + pip）

1. 進入 `backend`：
   ```bash
   cd backend
   ```
2. 建立並啟用虛擬環境：
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. 安裝依賴：
   ```bash
   pip install -r requirements.txt
   ```
4. 設定環境變數，建立 `.env` 並填入：
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   可在 Google AI for Developers 取得 API 金鑰。
5. 啟動伺服器：
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### 前端

1. 進入 `frontend`：
   ```bash
   cd frontend
   ```
2. 安裝依賴：
   ```bash
   npm install
   ```
3. 開發啟動：
   ```bash
   npm run dev
   ```
   預設將在 `http://localhost:5173`，並透過 Vite 代理呼叫後端 `/api/*`。

### 可選：使用 Poetry（如你偏好）

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 使用說明

- 在前端頁面輸入英文提示（提高品質），可調整比例、尺寸、人物生成等參數。
- 按下「生成圖片」後，前端會呼叫後端 `/api/generate`，後端再代理至 Google Imagen 服務並回傳 base64 圖片。

## 注意事項

- 生成的人物需遵守地區限制與政策；`allow_all` 在部分地區（歐盟、英國、瑞士、MENA）不可用。
- `sampleImageSize` 僅適用於 Standard / Ultra 模型；`aspectRatio` 支援：`"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"`。
- 單次最多生成 1~4 張圖片。

## 授權

此專案程式碼以 MIT License 釋出。
# Trigger deployment Fri Sep 19 14:24:01 CST 2025
