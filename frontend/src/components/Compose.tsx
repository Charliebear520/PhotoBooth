import React, { useRef, useCallback } from "react";
import { COLLAGE_WIDTH, COLLAGE_HEIGHT } from "../constants/styles";

interface ComposeProps {
  capturedPhotos: (string | null)[];
  onCompose: (dataUrl: string) => void;
  onBack: () => void;
}

export const Compose: React.FC<ComposeProps> = ({
  capturedPhotos,
  onCompose,
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canCompose = capturedPhotos.filter(Boolean).length === 4;

  const composeCollage = useCallback(async () => {
    if (!canCompose) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = COLLAGE_WIDTH;
    canvas.height = COLLAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cols = 2;
    const rows = 2;
    const gap = 20;
    const bottomSpace = 60; // 減少底部空間，因為沒有文字了


    // 計算可用空間（扣除底部文字空間）
    const availableW = canvas.width;
    const availableH = canvas.height - bottomSpace;

    // 計算格子尺寸 - 確保3:4比例
    const availableWidthForGrid = availableW - gap;
    const availableHeightForGrid = availableH - gap;

    // 計算每個格子的最大可能尺寸
    const maxCellW = availableWidthForGrid / cols;
    const maxCellH = availableHeightForGrid / rows;

    // 照片比例 3:4
    const photoRatio = 3 / 4;
    
    // 計算格子尺寸，保持3:4比例
    let cellW, cellH;
    if (maxCellW / maxCellH > photoRatio) {
      // 高度限制
      cellH = maxCellH;
      cellW = cellH * photoRatio;
    } else {
      // 寬度限制
      cellW = maxCellW;
      cellH = cellW / photoRatio;
    }

    // 計算總使用空間
    const totalW = cols * cellW + (cols - 1) * gap;
    const totalH = rows * cellH + (rows - 1) * gap;

    // 計算置中起始位置
    const startX = (canvas.width - totalW) / 2;
    const startY = (availableH - totalH) / 2;

    const loaded: HTMLImageElement[] = [];
    for (const url of capturedPhotos) {
      if (!url) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("load image failed"));
        img.src = url;
      });
      loaded.push(img);
    }

    loaded.forEach((img, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = startX + c * (cellW + gap);
      const y = startY + r * (cellH + gap);

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


    const dataUrl = canvas.toDataURL("image/png");
    onCompose(dataUrl);
  }, [canCompose, capturedPhotos, onCompose]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: 24,
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        <h2>步驟 5：拼貼預覽</h2>
        <canvas
          ref={canvasRef}
          style={{
            width: 360,
            height: 480,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <button onClick={onBack}>上一步</button>
          <button onClick={composeCollage} disabled={!canCompose}>
            合成 2x2 拍貼
          </button>
        </div>
      </div>
    </div>
  );
};
