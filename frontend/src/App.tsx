import { useState } from "react";
import "./App.css";
import { Home, Camera, Compose, Edit } from "./components";
import type { AppStep } from "./types";

function App() {
  // UI 階段：home -> camera -> compose -> edit
  const [step, setStep] = useState<AppStep>("home");
  
  // 調試信息
  console.log("App 組件已渲染，當前步驟:", step);

  // 合成後的 dataURL（透明底 2x2）
  const [collageDataUrl, setCollageDataUrl] = useState<string | null>(null);


  // 攝像頭相關狀態
  const [capturedPhotos, setCapturedPhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  // 處理步驟轉換
  const handleStart = () => {
    setStep("camera");
  };

  const handleCameraComplete = (photos: (string | null)[]) => {
    setCapturedPhotos(photos);
      setStep("compose");
  };

  const handleCompose = (dataUrl: string) => {
    setCollageDataUrl(dataUrl);
    setStep("edit");
  };

  const handleBackToCamera = () => {
              setStep("camera");
  };

  // 根據當前步驟渲染對應組件
  switch (step) {
    case "home":
      return <Home onStart={handleStart} />;
    
    case "camera":
      return (
        <Camera
          onComplete={handleCameraComplete}
        />
      );
    
    case "compose":
    return (
        <Compose
          capturedPhotos={capturedPhotos}
          onCompose={handleCompose}
          onBack={handleBackToCamera}
        />
      );
    
    case "edit":
  return (
        <Edit
          capturedPhotos={capturedPhotos}
          collageDataUrl={collageDataUrl}
          onBack={handleBackToCamera}
        />
      );
    
    default:
      return <Home onStart={handleStart} />;
  }
}

export default App;
