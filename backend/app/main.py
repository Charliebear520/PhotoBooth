import os
import sys
import base64
import logging
from typing import Optional, List, Dict, Any

try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form  # type: ignore
    from fastapi.middleware.cors import CORSMiddleware  # type: ignore
    from pydantic import BaseModel, Field  # type: ignore
    import httpx  # type: ignore
    from dotenv import load_dotenv  # type: ignore
except ImportError as e:
    print(f"Import error: {e}")
    # 在Vercel环境中这些包应该是可用的
    raise

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="文字提示，英文最佳")
    number_of_images: int = Field(1, ge=1, le=4, description="生成圖片數量 (1-4)")
    aspect_ratio: Optional[str] = Field(None, description='如 "1:1", "3:4", "4:3", "9:16", "16:9"')
    sample_image_size: Optional[str] = Field(None, description='Standard/Ultra 可用: "1K" 或 "2K"')
    person_generation: Optional[str] = Field(
        None, description='"dont_allow" | "allow_adult" | "allow_all" (受地區限制)'
    )
    model: str = Field(
        default="imagen-4.0-generate-001",
        description="Imagen 模型，例如 imagen-4.0-generate-001",
    )


class GenerateImage(BaseModel):
    image_base64: str


class GenerateResponse(BaseModel):
    images: List[GenerateImage]


def create_app() -> FastAPI:
    # 載入 .env 方便本地開發
    load_dotenv()
    app = FastAPI(title="PhotoBooth API", version="0.1.0")

    # 允許本地前端和Vercel部署
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173", 
            "http://127.0.0.1:5173",
            "https://*.vercel.app",
            "https://*.vercel.com",
            "*"  # 临时允许所有域名，生产环境应该更严格
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}
    
    @app.get("/api/debug")
    async def debug():
        """调试端点，检查环境变量和配置"""
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        
        # 安全地显示API密钥的前后几位
        def mask_api_key(key: str, show_chars: int = 4) -> str:
            if not key:
                return "未设置"
            if len(key) <= show_chars * 2:
                return f"{key[:show_chars]}...{key[-show_chars:]}" if len(key) > show_chars else key
            return f"{key[:show_chars]}...{key[-show_chars:]}"
        
        return {
            "status": "ok",
            "gemini_api_key_set": bool(gemini_key),
            "gemini_key_length": len(gemini_key),
            "gemini_key_preview": mask_api_key(gemini_key),
            "python_version": sys.version,
            "environment": os.getenv("VERCEL_ENV", "unknown"),
            "vercel_region": os.getenv("VERCEL_REGION", "unknown"),
            "all_env_vars": {k: v for k, v in os.environ.items() if "GEMINI" in k or "VERCEL" in k},
        }
    
    @app.post("/api/test-generate")
    async def test_generate():
        """测试生成端点，使用简单的提示"""
        try:
            logger.info("Test generate request")
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return {"error": "缺少 GEMINI_API_KEY", "status": "failed"}
            
            url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict"
            payload = {
                "instances": [{"prompt": "a simple red circle"}],
                "parameters": {"sampleCount": 1}
            }
            headers = {
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(url, json=payload, headers=headers)
                logger.info(f"Test generate response status: {r.status_code}")
                if r.status_code != 200:
                    return {"error": f"API returned {r.status_code}: {r.text[:200]}", "status": "failed"}
                return {"status": "success", "response_keys": list(r.json().keys())}
        except Exception as e:
            logger.error(f"Test generate error: {str(e)}")
            return {"error": str(e), "status": "failed"}

    @app.post("/api/generate", response_model=GenerateResponse)
    async def generate(req: GenerateRequest):
        try:
            logger.info(f"Generate request: {req.prompt[:50]}...")
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY not found")
                logger.error(f"Available env vars: {list(os.environ.keys())}")
                raise HTTPException(status_code=500, detail="缺少 GEMINI_API_KEY")

            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{req.model}:predict"
            )

            payload: Dict[str, Any] = {
                "instances": [{"prompt": req.prompt}],
                "parameters": {
                    "sampleCount": req.number_of_images,
                },
            }
            if req.aspect_ratio:
                payload["parameters"]["aspectRatio"] = req.aspect_ratio
            if req.sample_image_size:
                payload["parameters"]["sampleImageSize"] = req.sample_image_size
            if req.person_generation:
                payload["parameters"]["personGeneration"] = req.person_generation

            headers = {
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=90) as client:
                r = await client.post(url, json=payload, headers=headers)
                if r.status_code != 200:
                    try:
                        detail = r.json()
                    except Exception:
                        detail = r.text
                    raise HTTPException(status_code=r.status_code, detail=detail)

                data = r.json()
                # 遞迴擷取所有可能的 base64 欄位
                def collect_base64_images(obj: Any) -> List[str]:
                    found: List[str] = []
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            key = str(k).lower()
                            if key in {
                                "imagebytes",
                                "bytesbase64",
                                "image_base64",
                                "imagebytesbase64",
                                "bytesbase64encoded",
                            }:
                                if isinstance(v, bytes):
                                    found.append(base64.b64encode(v).decode("utf-8"))
                                elif isinstance(v, str):
                                    found.append(v)
                            # 常見巢狀結構: { image: { imageBytes: ... } }
                            if key in {"image", "image_data"} and isinstance(v, (dict, list)):
                                found.extend(collect_base64_images(v))
                            # 一般遞迴
                            if isinstance(v, (dict, list)):
                                found.extend(collect_base64_images(v))
                    elif isinstance(obj, list):
                        for item in obj:
                            found.extend(collect_base64_images(item))
                    return found

                # 依不同 SDK/REST 的可能外層鍵位嘗試
                candidate_roots = [
                    data,
                    data.get("predictions") if isinstance(data, dict) else None,
                    data.get("generatedImages") if isinstance(data, dict) else None,
                    data.get("generated_images") if isinstance(data, dict) else None,
                    data.get("response") if isinstance(data, dict) else None,
                ]
                b64_list: List[str] = []
                for root in candidate_roots:
                    if root is not None:
                        b64_list.extend(collect_base64_images(root))

                # 去重與清洗
                uniq: List[str] = []
                seen = set()
                for s in b64_list:
                    if not isinstance(s, str):
                        continue
                    trimmed = s.strip()
                    if len(trimmed) < 128:  # 過短的字串排除（大多非圖片）
                        continue
                    if trimmed in seen:
                        continue
                    seen.add(trimmed)
                    uniq.append(trimmed)

                generated_images = [GenerateImage(image_base64=s) for s in uniq[:4]]

                if not generated_images:
                    # 附上回應摘要以利除錯（不包含長字串）
                    def summarize(obj: Any, depth: int = 0) -> Any:
                        if depth > 2:
                            return "…"
                        if isinstance(obj, dict):
                            return {k: summarize(v, depth + 1) for k, v in list(obj.items())[:10]}
                        if isinstance(obj, list):
                            return [summarize(v, depth + 1) for v in obj[:5]]
                        if isinstance(obj, str):
                            return (obj[:200] + "…") if len(obj) > 200 else obj
                        return obj

                    raise HTTPException(
                        status_code=502,
                        detail={
                            "message": "未取得任何圖片",
                            "response_preview": summarize(data),
                        },
                    )

                return GenerateResponse(images=generated_images)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Generate API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"生成图片时发生错误: {str(e)}")

    @app.post("/api/stylize", response_model=GenerateResponse)
    async def stylize(
        prompt: str = Form(..., description="文字提示，會與風格描述一併使用"),
        number_of_images: int = Form(1),
        aspect_ratio: Optional[str] = Form(None),
        sample_image_size: Optional[str] = Form(None),
        person_generation: Optional[str] = Form(None),
        model: str = Form("imagen-4.0-generate-001"),
        image: UploadFile = File(...),
    ):
        try:
            logger.info(f"Stylize request: {prompt[:50]}...")
            # 讀入上傳圖片
            content = await image.read()
            if not content:
                raise HTTPException(status_code=400, detail="上傳圖片為空")

            # 使用 Gemini 2.5 Flash Image（多模態編輯）
            gemini_key = os.getenv("GEMINI_API_KEY")
            if not gemini_key:
                logger.error("GEMINI_API_KEY not found in stylize")
                logger.error(f"Available env vars: {list(os.environ.keys())}")
                raise HTTPException(status_code=500, detail="缺少 GEMINI_API_KEY")
            
            if gemini_key:
                image_b64 = base64.b64encode(content).decode("utf-8")
                # Gemini 多模態 generateContent：圖片 + 文字
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    "gemini-2.5-flash-image-preview:generateContent"
                )
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "inline_data": {
                                        "mime_type": image.content_type or "image/png",
                                        "data": image_b64,
                                    }
                                },
                                {"text": prompt},
                            ],
                        }
                    ],
                    "generationConfig": {
                        "candidateCount": 1
                    },
                }
                headers = {
                    "x-goog-api-key": gemini_key,
                    "Content-Type": "application/json",
                }
                async with httpx.AsyncClient(timeout=120) as client:
                    r = await client.post(url, json=payload, headers=headers)
                    if r.status_code != 200:
                        try:
                            detail = r.json()
                        except Exception:
                            detail = r.text
                        msg = str(detail)
                        unsupported = "not supported" in msg.lower() or "unsupported" in msg.lower()
                        if not unsupported:
                            raise HTTPException(status_code=r.status_code, detail=detail)
                    else:
                        data = r.json()
                        # 從 candidates -> content -> parts 取回 inline_data（base64）
                        def collect_b64_from_gemini(obj: Any) -> List[str]:
                            found: List[str] = []
                            if isinstance(obj, dict):
                                for k, v in obj.items():
                                    key = str(k)
                                    if key in ("inline_data", "inlineData") and isinstance(v, dict):
                                        b64 = v.get("data")
                                        if isinstance(b64, str) and len(b64) > 128:
                                            found.append(b64)
                                    if isinstance(v, (dict, list)):
                                        found.extend(collect_b64_from_gemini(v))
                            elif isinstance(obj, list):
                                for it in obj:
                                    found.extend(collect_b64_from_gemini(it))
                            return found

                        gemini_b64_list: List[str] = []
                        cands = data.get("candidates") if isinstance(data, dict) else None
                        if isinstance(cands, list):
                            for c in cands:
                                content = c.get("content") if isinstance(c, dict) else None
                                parts = content.get("parts") if isinstance(content, dict) else None
                                if isinstance(parts, list):
                                    gemini_b64_list.extend(collect_b64_from_gemini(parts))
                        if not gemini_b64_list:
                            gemini_b64_list = collect_b64_from_gemini(data)
                        if not gemini_b64_list:
                            raise HTTPException(status_code=502, detail={
                                "message": "未取得任何圖片 (Gemini)",
                                "response_preview": {k: type(v).__name__ for k, v in data.items()} if isinstance(data, dict) else str(type(data)),
                            })
                        return GenerateResponse(images=[GenerateImage(image_base64=gemini_b64_list[0])])

            # 如果Gemini多模态不支持，尝试使用Imagen模型
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="缺少 GEMINI_API_KEY")

            image_b64 = base64.b64encode(content).decode("utf-8")
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:predict"
            )

            payload: Dict[str, Any] = {
                "instances": [
                    {
                        "prompt": prompt,
                        "image": {"bytesBase64Encoded": image_b64},
                    }
                ],
                "parameters": {
                    "sampleCount": number_of_images,
                },
            }
            if aspect_ratio:
                payload["parameters"]["aspectRatio"] = aspect_ratio
            if sample_image_size:
                payload["parameters"]["sampleImageSize"] = sample_image_size
            if person_generation:
                payload["parameters"]["personGeneration"] = person_generation

            headers = {
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=90) as client:
                r = await client.post(url, json=payload, headers=headers)
                if r.status_code != 200:
                    try:
                        detail = r.json()
                    except Exception:
                        detail = r.text
                    raise HTTPException(status_code=r.status_code, detail=detail)

                data = r.json()

                # 沿用上方解析邏輯
                def collect_base64_images(obj: Any) -> List[str]:
                    found: List[str] = []
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            key = str(k).lower()
                            if key in {
                                "imagebytes",
                                "bytesbase64",
                                "image_base64",
                                "imagebytesbase64",
                                "bytesbase64encoded",
                            }:
                                if isinstance(v, bytes):
                                    found.append(base64.b64encode(v).decode("utf-8"))
                                elif isinstance(v, str):
                                    found.append(v)
                                if key in {"image", "image_data"} and isinstance(v, (dict, list)):
                                    found.extend(collect_base64_images(v))
                                if isinstance(v, (dict, list)):
                                    found.extend(collect_base64_images(v))
                    elif isinstance(obj, list):
                        for item in obj:
                            found.extend(collect_base64_images(item))
                    return found

                candidate_roots = [
                    data,
                    data.get("predictions") if isinstance(data, dict) else None,
                    data.get("generatedImages") if isinstance(data, dict) else None,
                    data.get("generated_images") if isinstance(data, dict) else None,
                    data.get("response") if isinstance(data, dict) else None,
                ]
                b64_list: List[str] = []
                for root in candidate_roots:
                    if root is not None:
                        b64_list.extend(collect_base64_images(root))

                uniq: List[str] = []
                seen = set()
                for s in b64_list:
                    if not isinstance(s, str):
                        continue
                    trimmed = s.strip()
                    if len(trimmed) < 128:
                        continue
                    if trimmed in seen:
                        continue
                    seen.add(trimmed)
                    uniq.append(trimmed)

                generated_images = [GenerateImage(image_base64=s) for s in uniq[:4]]

                if not generated_images:
                    def summarize(obj: Any, depth: int = 0) -> Any:
                        if depth > 2:
                            return "…"
                        if isinstance(obj, dict):
                            return {k: summarize(v, depth + 1) for k, v in list(obj.items())[:10]}
                        if isinstance(obj, list):
                            return [summarize(v, depth + 1) for v in obj[:5]]
                        if isinstance(obj, str):
                            return (obj[:200] + "…") if len(obj) > 200 else obj
                        return obj

                    raise HTTPException(
                        status_code=502,
                        detail={
                            "message": "未取得任何圖片",
                            "response_preview": summarize(data),
                        },
                    )

                return GenerateResponse(images=generated_images)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stylize API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"风格转换时发生错误: {str(e)}")

    return app


app = create_app()