import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "./useCamera";

export const usePhotoCapture = () => {
  const { stream, error, videoRef, startCamera, stopCamera } = useCamera();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedPhotos, setCapturedPhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !captureCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 水平翻轉畫布
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.restore();

    const dataURL = canvas.toDataURL("image/png");

    setCapturedPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[currentPhotoIndex] = dataURL;
      return newPhotos;
    });

    setIsCapturing(false);
    setCountdown(null);
  }, [currentPhotoIndex]);

  const startCountdown = useCallback(() => {
    setCountdown(5);
    setIsCapturing(true);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          capturePhoto();
          return null;
        }
        return (prev as number) - 1;
      });
    }, 1000);
  }, [capturePhoto]);

  // 當索引變更且該張尚未拍攝時，自動開始倒數一次
  useEffect(() => {
    if (!stream) return;
    if (
      !capturedPhotos[currentPhotoIndex] &&
      countdown === null &&
      !isCapturing
    ) {
      // 稍作延遲，確保畫面穩定
      const t = setTimeout(() => startCountdown(), 500);
      return () => clearTimeout(t);
    }
  }, [
    currentPhotoIndex,
    capturedPhotos,
    countdown,
    isCapturing,
    startCountdown,
    stream,
  ]);

  const retakePhoto = useCallback(() => {
    setCapturedPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[currentPhotoIndex] = null;
      return newPhotos;
    });
    // 確保攝像頭正在運行，然後開始倒數
    if (!stream) {
      startCamera().then(() => {
        setTimeout(() => startCountdown(), 500);
      });
    } else {
      // 如果攝像頭已經在運行，直接開始倒數
      setTimeout(() => startCountdown(), 100);
    }
  }, [currentPhotoIndex, stream, startCamera, startCountdown]);

  const nextPhoto = useCallback(() => {
    if (currentPhotoIndex < 3) {
      setCurrentPhotoIndex((prev) => prev + 1);
    } else {
      // 四張照片都拍完了，停止攝像頭並轉到合成步驟
      stopCamera();
      return true; // 表示完成拍攝
    }
    return false;
  }, [currentPhotoIndex, stopCamera]);

  const canCompose = capturedPhotos.filter(Boolean).length === 4;

  return {
    stream,
    error,
    videoRef,
    startCamera,
    stopCamera,
    currentPhotoIndex,
    countdown,
    isCapturing,
    capturedPhotos,
    captureCanvasRef,
    startCountdown,
    retakePhoto,
    nextPhoto,
    canCompose,
  };
};

