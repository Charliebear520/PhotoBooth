import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { BG_STYLES, PHOTO_STYLES, COLLAGE_WIDTH, COLLAGE_HEIGHT } from "../constants/styles";
import type { BackgroundStyle, PhotoStyle, GenerateResponse } from "../types";

interface EditProps {
  capturedPhotos: (string | null)[];
  collageDataUrl: string | null;
  onBack: () => void;
}

export const Edit: React.FC<EditProps> = ({
  capturedPhotos,
  collageDataUrl,
  onBack,
}) => {
  // 單張風格化的結果（若無則使用原圖）
  const [, setStyledUrls] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  // 風格化處理結果（最終輸出）
  const [stylizedUrl, setStylizedUrl] = useState<string | null>(null);

  // 當前預覽圖片（包含背景的即時預覽）
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 其餘控制
  const [loadingStyleKey, setLoadingStyleKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 風格選擇（背景/照片 分離）
  const [bgKey, setBgKey] = useState<BackgroundStyle | null>("清新日系");
  const [photoKey, setPhotoKey] = useState<PhotoStyle | null>(null);


  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 統一的照片位置計算函數
  const calculatePhotoPosition = useCallback((i: number, cellW: number, cellH: number, gap: number, margin: number, startY: number) => {
    const cols = 2;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = margin + c * (cellW + gap) + 110; // 向右偏移50px (70+50=120)
    const y = startY + r * (cellH + gap) + 80; // 統一的Y偏移
    return { x, y };
  }, []);

  // 生成即時預覽（包含背景和文字）
  const generatePreview = useCallback(async () => {
    if (!collageDataUrl) return;

    const canvas = document.createElement("canvas");
    canvas.width = COLLAGE_WIDTH;
    canvas.height = COLLAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 白底
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 直接使用原始照片進行佈局
    const margin = 60;
    const cols = 2;
    const rows = 2;
    const gap = 20;
    const bottomSpace = 60; // 減少底部空間，因為沒有文字了
    
    const availableW = canvas.width - margin * 2 - (cols - 1) * gap;
    const availableH = canvas.height - margin * 2 - (rows - 1) * gap - bottomSpace;
    
    // 照片比例 3:4，縮小到 2/3
    const photoRatio = 3 / 4;
    const scaleFactor = 4 / 5; // 縮小到 2/3
    
    const maxCellW = availableW / cols;
    const maxCellH = availableH / rows;
    
    // 計算格子尺寸，保持3:4比例並縮小到 2/3
    let cellW, cellH;
    if (maxCellW / maxCellH > photoRatio) {
      // 高度限制
      cellH = maxCellH * scaleFactor;
      cellW = cellH * photoRatio;
    } else {
      // 寬度限制
      cellW = maxCellW * scaleFactor;
      cellH = cellW / photoRatio;
    }
    
    const usedH = rows * cellH + (rows - 1) * gap;
    const startY = margin + (availableH - usedH) / 2;

    // 載入原始照片
    const loadedPhotos: HTMLImageElement[] = [];
    for (const photoUrl of capturedPhotos) {
      if (!photoUrl) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("照片載入失敗"));
        img.src = photoUrl;
      });
      loadedPhotos.push(img);
    }
    
    for (let i = 0; i < loadedPhotos.length; i++) {
      const img = loadedPhotos[i];
      const { x, y } = calculatePhotoPosition(i, cellW, cellH, gap, margin, startY);
      
      // 使用 cover 模式，確保圖片填滿3:4比例格子並保持比例
      const imgRatio = img.width / img.height;
      const cellRatio = photoRatio; // 3:4 比例

      let sourceX = 0;
      let sourceY = 0;
      let sourceW = img.width;
      let sourceH = img.height;

      if (imgRatio > cellRatio) {
        // 圖片比格子寬，裁切左右
        sourceW = img.height * cellRatio;
        sourceX = (img.width - sourceW) / 2;
      } else {
        // 圖片比格子高，裁切上下
        sourceH = img.width / cellRatio;
        sourceY = (img.height - sourceH) / 2;
      }
      
      // 圓角矩形路徑
      const rad = 16;
      const path = new Path2D();
      path.moveTo(x + rad, y);
      path.lineTo(x + cellW - rad, y);
      path.quadraticCurveTo(x + cellW, y, x + cellW, y + rad);
      path.lineTo(x + cellW, y + cellH - rad);
      path.quadraticCurveTo(x + cellW, y + cellH, x + cellW - rad, y + cellH);
      path.lineTo(x + rad, y + cellH);
      path.quadraticCurveTo(x, y + cellH, x, y + cellH - rad);
      path.lineTo(x, y + rad);
      path.quadraticCurveTo(x, y, x + rad, y);
      
      // 陰影
      const shadowSpread = 12;
      (ctx as any).shadowColor = "rgba(0,0,0,0.18)";
      (ctx as any).shadowBlur = shadowSpread;
      (ctx as any).shadowOffsetY = 6;
      ctx.fillStyle = "rgba(255,255,255,0.001)";
      ctx.fill(path);
      (ctx as any).shadowBlur = 0;
      
      ctx.save();
      ctx.clip(path);
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        x,
        y,
        cellW,
        cellH
      );
      ctx.restore();
    }

    // 載入並繪製相框背景（在照片上方）
    if (bgKey) {
      try {
        const bg = await new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = () => rej(new Error("背景圖片載入失敗"));
          img.src = BG_STYLES[bgKey];
        });
        
        const bgRatio = bg.width / bg.height;
        const cvRatio = canvas.width / canvas.height;
        let bgW = canvas.width;
        let bgH = canvas.height;
        if (bgRatio > cvRatio) {
          bgH = canvas.height;
          bgW = bgH * bgRatio;
        } else {
          bgW = canvas.width;
          bgH = bgW / bgRatio;
        }
        ctx.drawImage(
          bg,
          (canvas.width - bgW) / 2,
          (canvas.height - bgH) / 2,
          bgW,
          bgH
        );
      } catch (error) {
        console.warn("背景載入失敗，使用白底:", error);
      }
    }

    const newDataUrl = canvas.toDataURL("image/png");
    setPreviewUrl(newDataUrl);
  }, [capturedPhotos, bgKey]);


  // 監聽背景風格變化，即時更新預覽
  useEffect(() => {
    if (capturedPhotos.filter(Boolean).length === 4) {
      generatePreview();
    }
  }, [bgKey, generatePreview, capturedPhotos]);


  // 單張風格化工具
  const stylizeSingle = useCallback(
    async (idx: number) => {
      const photoDataUrl = capturedPhotos[idx];
      if (!photoDataUrl || !photoKey) return; // 無照片或未選照片風格則跳過

      // 如果是原始照片風格，直接使用原始照片，不進行AI處理
      if (photoKey === "原始照片") {
        setStyledUrls((prev) => {
          const c = [...prev];
          c[idx] = photoDataUrl;
          return c;
        });
        return;
      }

      // 將dataURL轉換為File
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      const f = new File([blob], `photo_${idx}.png`, { type: "image/png" });
      try {
        const form = new FormData();
        form.append("prompt", PHOTO_STYLES[photoKey]);
        form.append("number_of_images", "1");
        form.append("model", "imagen-4.0-generate-001");
        form.append("image", f);
        let data: GenerateResponse;
        try {
          const r = await axios.post<GenerateResponse>("/api/stylize", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          data = r.data;
        } catch {
          // 後備：純文字
          const r2 = await axios.post<GenerateResponse>("/api/generate", {
            prompt: PHOTO_STYLES[photoKey],
            number_of_images: 1,
          });
          data = r2.data;
        }
        const b64 = data.images?.[0]?.image_base64;
        if (!b64) throw new Error("未取得單張風格結果");
        const dataUrl = `data:image/png;base64,${b64}`;
        setStyledUrls((prev) => {
          const c = [...prev];
          c[idx] = dataUrl;
          return c;
        });
      } catch (e: any) {
        setError(e?.message || `第 ${idx + 1} 張處理失敗`);
      }
    },
    [capturedPhotos, photoKey]
  );

  // 變更照片風格時，對現有照片全部重跑
  useEffect(() => {
    if (!photoKey) return;
    capturedPhotos.forEach((photo, idx) => {
      if (photo) stylizeSingle(idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey]);

  const downloadImage = useCallback(() => {
    const url = stylizedUrl || previewUrl || collageDataUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "photobooth.png";
    a.click();
  }, [stylizedUrl, previewUrl, collageDataUrl]);

  // 生成背景，最後合成（在此階段統一對四張照片做風格化）
  const runStyling = useCallback(async () => {
    if (capturedPhotos.filter(Boolean).length !== 4) return;
    const currentKey = `${bgKey || "無背景"}|${
      photoKey || "原圖"
    } 最終統一處理`;
    setLoadingStyleKey(currentKey);
    setError(null);
    try {
      // 1) 先準備四張來源（從拍攝的照片取得 Blob）
      const blobs: (Blob | null)[] = [];
      for (let i = 0; i < 4; i++) {
        const photoDataUrl = capturedPhotos[i];
        if (photoDataUrl) {
          const r = await fetch(photoDataUrl);
          blobs.push(await r.blob());
        } else {
          blobs.push(null);
        }
      }

      // 2) 若有選擇照片風格，對四張逐一風格化（可平行，但為簡化採順序以減少併發壓力）
      const perImageUrls: string[] = [];
      for (let i = 0; i < 4; i++) {
        const b = blobs[i];
        if (!b) throw new Error(`缺少第 ${i + 1} 張來源`);
        if (photoKey) {
          const file = new File([b], `img${i + 1}.png`, {
            type: b.type || "image/png",
          });
          const form = new FormData();
          form.append("prompt", PHOTO_STYLES[photoKey]);
          form.append("number_of_images", "1");
          form.append("model", "imagen-4.0-generate-001");
          form.append("image", file);
          let data: GenerateResponse;
          try {
            const r = await axios.post<GenerateResponse>("/api/stylize", form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            data = r.data;
          } catch {
            const r2 = await axios.post<GenerateResponse>("/api/generate", {
              prompt: PHOTO_STYLES[photoKey],
              number_of_images: 1,
            });
            data = r2.data;
          }
          const b64 = data.images?.[0]?.image_base64;
          if (!b64) throw new Error(`第 ${i + 1} 張風格化失敗`);
          perImageUrls.push(`data:image/png;base64,${b64}`);
        } else {
          perImageUrls.push(URL.createObjectURL(b));
        }
      }

      // 3) 背景載入（使用預設相框背景圖片）
      let bgUrl: string | null = null;
      if (bgKey) {
        bgUrl = BG_STYLES[bgKey];
      }

      // 4) 共同合成（白底 -> 2x2 圖片 -> 相框背景）
      const canvas = document.createElement("canvas");
      canvas.width = COLLAGE_WIDTH;
      canvas.height = COLLAGE_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      // 白底
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2x2 佈局（正方形）
      const margin = 60;
      const cols = 2;
      const rows = 2;
      const gap = 20;
      const bottomSpace = 60; // 減少底部空間，因為沒有文字了
      // 正方形格子
      const availableW = canvas.width - margin * 2 - (cols - 1) * gap;
      const availableH =
        canvas.height - margin * 2 - (rows - 1) * gap - bottomSpace;

      // 照片比例 3:4，縮小到 2/3
      const photoRatio = 3 / 4;
      const scaleFactor = 4 / 5; // 與預覽函數保持一致
      
      // 計算格子尺寸，保持3:4比例並縮小到 2/3
      const maxCellW = availableW / cols;
      const maxCellH = availableH / rows;
      
      let cellW, cellH;
      if (maxCellW / maxCellH > photoRatio) {
        // 高度限制
        cellH = maxCellH * scaleFactor;
        cellW = cellH * photoRatio;
      } else {
        // 寬度限制
        cellW = maxCellW * scaleFactor;
        cellH = cellW / photoRatio;
      }

      const usedH = rows * cellH + (rows - 1) * gap;
      const startY = margin + (availableH - usedH) / 2;

      // 載入四張
      const imgs: HTMLImageElement[] = [];
      for (const u of perImageUrls) {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => res(im);
          im.onerror = () => rej(new Error("img load fail"));
          im.src = u;
        });
        imgs.push(img);
      }

      imgs.forEach((img, i) => {
        const { x, y } = calculatePhotoPosition(i, cellW, cellH, gap, margin, startY);

        // 使用 cover 模式，確保圖片填滿3:4比例格子並保持比例
        const imgRatio = img.width / img.height;
        const cellRatio = photoRatio; // 3:4 比例

        let sourceX = 0;
        let sourceY = 0;
        let sourceW = img.width;
        let sourceH = img.height;

        if (imgRatio > cellRatio) {
          // 圖片比格子寬，裁切左右
          sourceW = img.height * cellRatio;
          sourceX = (img.width - sourceW) / 2;
        } else {
          // 圖片比格子高，裁切上下
          sourceH = img.width / cellRatio;
          sourceY = (img.height - sourceH) / 2;
        }

        const rad = 16;
        const path = new Path2D();
        path.moveTo(x + rad, y);
        path.lineTo(x + cellW - rad, y);
        path.quadraticCurveTo(x + cellW, y, x + cellW, y + rad);
        path.lineTo(x + cellW, y + cellH - rad);
        path.quadraticCurveTo(x + cellW, y + cellH, x + cellW - rad, y + cellH);
        path.lineTo(x + rad, y + cellH);
        path.quadraticCurveTo(x, y + cellH, x, y + cellH - rad);
        path.lineTo(x, y + rad);
        path.quadraticCurveTo(x, y, x + rad, y);

        // 陰影
        const shadowSpread = 12;
        (ctx as any).shadowColor = "rgba(0,0,0,0.18)";
        (ctx as any).shadowBlur = shadowSpread;
        (ctx as any).shadowOffsetY = 6;
        ctx.fillStyle = "rgba(255,255,255,0.001)";
        ctx.fill(path);
        (ctx as any).shadowBlur = 0;

        ctx.save();
        ctx.clip(path);
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceW,
          sourceH,
          x,
          y,
          cellW,
          cellH
        );
        ctx.restore();
      });

      // 相框背景（在照片上方）
      if (bgUrl) {
        const bg = await new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = () => rej(new Error("背景圖片載入失敗"));
          img.src = bgUrl!;
        });
        const bgRatio = bg.width / bg.height;
        const cvRatio = canvas.width / canvas.height;
        let bgW = canvas.width;
        let bgH = canvas.height;
        if (bgRatio > cvRatio) {
          bgH = canvas.height;
          bgW = bgH * bgRatio;
        } else {
          bgW = canvas.width;
          bgH = bgW / bgRatio;
        }
        ctx.drawImage(
          bg,
          (canvas.width - bgW) / 2,
          (canvas.height - bgH) / 2,
          bgW,
          bgH
        );
      }

      const out = canvas.toDataURL("image/png");
      setStylizedUrl(out);
    } catch (err: any) {
      setError(err?.message || "風格化失敗");
    } finally {
      setLoadingStyleKey(null);
    }
  }, [capturedPhotos, bgKey, photoKey]);

  return (
    <div
      style={{
        //height: "100vh",
        //width: "100vw",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "white",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: "0 2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0",
            alignItems: "stretch",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* 左側：照片預覽 */}
          <div
            style={{
              flex: "0 1 50%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "0 10px 0 20px",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                alignItems:"center",
                justifyContent:"center",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* <h3
                style={{
                  textAlign: "center",
                  margin: "16px",
                  color: "#2d3748",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  flexShrink: 0,
                }}
              >
                📸 照片預覽
              </h3> */}
              <div
                style={{
                  display: "flex",
                  height:"90%",
                  width:"90%",
                  
                  justifyContent: "center",
                  flex: 1,
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {stylizedUrl ? (
                  <img
                    src={stylizedUrl}
                    alt="stylized"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    }}
                  />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    }}
                  />
                ) : (
                  <>
                    <img
                      src={collageDataUrl || undefined}
                      alt="collage"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        border: "2px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      }}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{ display: collageDataUrl ? "none" : "block" }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 右側：風格選擇 */}
          <div
            style={{
              flex: "0 1 50%",
              height: "100%",
              //overflow: "hidden",
              padding: "20px 20px 0 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                height: "100%",
                overflowY: "auto",
                //paddingRight: "8px",
                // 隱藏滾動條但保持滾動功能
                scrollbarWidth: "none", // Firefox
                msOverflowStyle: "none", // IE/Edge
              }}
              className="hide-scrollbar"
            >
              {/* 風格選擇區域 */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #cbd5e0",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    marginBottom: "10px",
                    color: "#2d3748",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  🎨 風格選擇
                </h3>

                <div style={{ display: "flex", gap: "16px" }}>
                  {/* 左側：相框背景風格 */}
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        marginBottom: "12px",
                        color: "#0277bd",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      🖼️ 相框背景風格
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {Object.keys(BG_STYLES).map((k) => {
                        const active = bgKey === (k as BackgroundStyle);
                        return (
                          <button
                            key={k}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: active
                                ? "2px solid #0288d1"
                                : "2px solid #e0e0e0",
                              background: active ? "#0288d1" : "#ffffff",
                              color: active ? "#ffffff" : "#424242",
                              fontSize: "12px",
                              fontWeight: active ? "bold" : "normal",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              boxShadow: active
                                ? "0 2px 8px rgba(2, 136, 209, 0.3)"
                                : "0 1px 4px rgba(0,0,0,0.1)",
                            }}
                            onClick={() => setBgKey(k as BackgroundStyle)}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 右側：照片人像風格 */}
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        marginBottom: "12px",
                        color: "#7b1fa2",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      👤 照片人像風格
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {Object.keys(PHOTO_STYLES).map((k) => {
                        const active = photoKey === (k as PhotoStyle);
                        return (
                          <button
                            key={k}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: active
                                ? "2px solid #8e24aa"
                                : "2px solid #e0e0e0",
                              background: active ? "#8e24aa" : "#ffffff",
                              color: active ? "#ffffff" : "#424242",
                              fontSize: "12px",
                              fontWeight: active ? "bold" : "normal",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              boxShadow: active
                                ? "0 2px 8px rgba(142, 36, 170, 0.3)"
                                : "0 1px 4px rgba(0,0,0,0.1)",
                            }}
                            onClick={() => setPhotoKey(k as PhotoStyle)}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>


              {/* 操作按鈕 */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fff3e0, #ffe0b2)",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #ffcc02",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    marginBottom: "8px",
                    color: "#f57c00",
                    fontSize: "0.95rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⚙️ 操作選項
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={onBack}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      background: "#ffffff",
                      color: "#4a5568",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    🔄 重新拍攝
                  </button>

                  <button
                    disabled={!collageDataUrl || !!loadingStyleKey}
                    onClick={runStyling}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      background: loadingStyleKey
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: loadingStyleKey ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                      boxShadow: loadingStyleKey
                        ? "none"
                        : "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    {loadingStyleKey ? "🎨 處理中…" : "🎨 套用風格並生成"}
                  </button>

                  <button
                    onClick={downloadImage}
                    disabled={!stylizedUrl && !previewUrl && !collageDataUrl}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      background:
                        !stylizedUrl && !previewUrl && !collageDataUrl
                          ? "#94a3b8"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor:
                        !stylizedUrl && !previewUrl && !collageDataUrl
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                      boxShadow:
                        !stylizedUrl && !previewUrl && !collageDataUrl
                          ? "none"
                          : "0 2px 8px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    💾 下載照片
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#dc2626",
              background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
              padding: "16px",
              borderRadius: "12px",
              marginTop: "20px",
              border: "1px solid #fecaca",
              textAlign: "center",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
            }}
          >
            ⚠️ 錯誤：{error}
          </div>
        )}
      </div>
    </div>
  );
};
