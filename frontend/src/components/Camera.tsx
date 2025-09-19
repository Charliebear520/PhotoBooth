import React, { useCallback, useEffect } from "react";
import { usePhotoCapture } from "../hooks/usePhotoCapture";

interface CameraProps {
  onComplete: (capturedPhotos: (string | null)[]) => void;
}

export const Camera: React.FC<CameraProps> = ({ onComplete }) => {
  const {
    stream,
    error,
    videoRef,
    startCamera,
    currentPhotoIndex,
    countdown,
    isCapturing,
    capturedPhotos,
    captureCanvasRef,
    startCountdown,
    retakePhoto,
    nextPhoto,
  } = usePhotoCapture();

  // 調試信息
  console.log("Camera 組件渲染:", {
    stream: !!stream,
    error,
    currentPhotoIndex,
    countdown,
    isCapturing,
    capturedPhotosCount: capturedPhotos.filter(Boolean).length
  });

  // 組件掛載時自動啟動攝像頭
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log("開始初始化攝像頭...");
        await startCamera();
        console.log("攝像頭初始化成功");
      } catch (err) {
        console.error("攝像頭初始化失敗:", err);
      }
    };

    initCamera();
  }, [startCamera]);

  const handleNextPhoto = useCallback(() => {
    const isComplete = nextPhoto();
    if (isComplete) {
      // 直接使用當前的 capturedPhotos 狀態
      onComplete(capturedPhotos);
    }
  }, [nextPhoto, capturedPhotos, onComplete]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: 30, height: "70vh" }}>
          {/* 左側：攝像頭預覽和拍攝的照片 */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* 攝像頭預覽 */}
            <div
              style={{
                position: "relative",
                flex: 1,
                border: "3px solid #e2e8f0",
                borderRadius: "20px",
                overflow: "hidden",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              }}
            >
              {!stream && (
                <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>📷</div>
                  <p style={{ fontSize: "18px", marginBottom: "20px" }}>
                    {error ? "攝像頭啟動失敗" : "點擊「啟動攝像頭」開始拍攝"}
                  </p>
                  <button
                    onClick={startCamera}
                    style={{
                      padding: "16px 32px",
                      fontSize: "18px",
                      background: error 
                        ? "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)"
                        : "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      cursor: "pointer",
                      marginTop: "12px",
                      fontWeight: "bold",
                      boxShadow: "0 4px 12px rgba(0,123,255,0.3)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,123,255,0.4)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.3)";
                    }}
                  >
                    {error ? "🔄 重新啟動攝像頭" : "🚀 啟動攝像頭"}
                  </button>
                  {error && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "16px",
                        background: "linear-gradient(135deg, #f8d7da, #f5c6cb)",
                        color: "#721c24",
                        borderRadius: "12px",
                        fontSize: "14px",
                        border: "1px solid #f1aeb5",
                        maxWidth: "400px",
                        margin: "20px auto 0",
                      }}
                    >
                      <strong>⚠️ 錯誤詳情：</strong><br />
                      {error}
                    </div>
                  )}
                </div>
              )}

              {stream && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      backgroundColor: "#000",
                      transform: "scaleX(-1)", // 水平翻轉
                    }}
                    onLoadedMetadata={() => {
                      console.log(
                        "視頻元數據已加載，尺寸:",
                        videoRef.current?.videoWidth,
                        "x",
                        videoRef.current?.videoHeight
                      );
                      // 強制播放
                      if (videoRef.current) {
                        videoRef.current.play().catch(console.error);
                      }
                    }}
                    onCanPlay={() => {
                      console.log("視頻可以播放");
                    }}
                    onError={(e) => {
                      console.error("視頻播放錯誤:", e);
                    }}
                    onPlay={() => {
                      console.log("視頻正在播放");
                    }}
                    onLoadStart={() => {
                      console.log("視頻開始加載");
                    }}
                    onWaiting={() => {
                      console.log("視頻等待數據");
                    }}
                  />

                  {/* 已拍攝照片覆蓋層 */}
                  {capturedPhotos[currentPhotoIndex] && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "#f8f9fa",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          background: "#28a745",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        ✓ 第 {currentPhotoIndex + 1} 張照片已拍攝
                      </div>
                      <img
                        src={capturedPhotos[currentPhotoIndex]!}
                        alt={`captured_${currentPhotoIndex}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}

                  {/* 倒數計時覆蓋層 */}
                  {countdown !== null && !capturedPhotos[currentPhotoIndex] && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "120px",
                        fontWeight: "bold",
                        color: "white",
                        textShadow: "0 0 20px rgba(255,255,255,0.8)",
                      }}
                    >
                      {countdown}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 右側：縮圖/操作區 */}
          <div
            style={{
              width: "320px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              justifyContent: "center",
              background: "#f8fafc",
              borderRadius: "20px",
              padding: "30px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            {/* 已拍攝縮圖列表（拍攝階段顯示） */}
            {!capturedPhotos[currentPhotoIndex] && (
              <div style={{ display: "grid", gap: 12 }}>
                {[0, 1, 2, 3]
                  .filter((i) => capturedPhotos[i])
                  .map((i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        position: "relative",
                        background: "#fff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                    >
                      <img
                        src={capturedPhotos[i]!}
                        alt={`thumb_${i}`}
                        style={{
                          width: "100%",
                          height: 100,
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#3b82f6",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {!capturedPhotos[currentPhotoIndex] && (
              <button
                onClick={startCountdown}
                disabled={isCapturing}
                style={{
                  padding: "18px 32px",
                  fontSize: "18px",
                  background: isCapturing
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "50px",
                  cursor: isCapturing ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  boxShadow: isCapturing
                    ? "none"
                    : "0 8px 20px rgba(239, 68, 68, 0.3)",
                  transition: "all 0.3s ease",
                  width: "100%",
                }}
              >
                {isCapturing ? "拍攝中..." : "📸 拍攝照片"}
              </button>
            )}

            {capturedPhotos[currentPhotoIndex] && (
              <>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  🎉 第{currentPhotoIndex + 1}張照片拍攝完成!
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    onClick={retakePhoto}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      fontSize: "16px",
                      background: "#ffffff",
                      color: "#4a5568",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    🔄 重新拍攝
                  </button>

                  <button
                    onClick={handleNextPhoto}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      fontSize: "16px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    {currentPhotoIndex < 3 ? "✅ 保留照片" : "🎯 完成拍攝"}
                  </button>
                </div>

                <div
                  style={{
                    background: "linear-gradient(135deg, #e0f2fe, #b3e5fc)",
                    padding: "16px",
                    borderRadius: "12px",
                    textAlign: "center",
                    fontSize: "16px",
                    color: "#0277bd",
                    fontWeight: "bold",
                    border: "1px solid #81d4fa",
                  }}
                >
                  📊 拍攝進度: {currentPhotoIndex + 1}/4
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#dc2626",
              background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
              padding: "16px",
              borderRadius: "12px",
              marginTop: 20,
              border: "1px solid #fecaca",
              textAlign: "center",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)",
            }}
          >
            ⚠️ 錯誤：{error}
          </div>
        )}

        {/* 隱藏的canvas用於拍照 */}
        <canvas ref={captureCanvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
};
