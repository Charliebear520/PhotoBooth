import { useCallback, useEffect, useRef, useState } from "react";

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log("正在請求攝像頭權限...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user", // 使用前置攝像頭
        },
      });

      console.log("攝像頭權限已獲取，視頻流:", mediaStream);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("視頻元素已設置");

        // 確保視頻開始播放
        const playVideo = () => {
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                console.log("視頻開始播放");
              })
              .catch((err) => {
                console.log("視頻播放失敗:", err);
                // 如果播放失敗，稍後再試
                setTimeout(playVideo, 100);
              });
          }
        };

        // 設置事件監聽器
        videoRef.current.onloadedmetadata = () => {
          console.log("視頻元數據已加載");
          playVideo();
        };

        // 如果元數據已經加載，直接播放
        if (videoRef.current.readyState >= 1) {
          playVideo();
        }
      }
    } catch (err: any) {
      console.error("攝像頭啟動失敗:", err);
      let errorMessage = "無法訪問攝像頭";

      if (err.name === "NotAllowedError") {
        errorMessage = "攝像頭權限被拒絕，請允許瀏覽器訪問攝像頭";
      } else if (err.name === "NotFoundError") {
        errorMessage = "找不到攝像頭設備";
      } else if (err.name === "NotReadableError") {
        errorMessage = "攝像頭正被其他應用程式使用";
      }

      setError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // 當stream設置後，確保視頻播放
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  // 清理攝像頭資源
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream,
    error,
    videoRef,
    startCamera,
    stopCamera,
  };
};

