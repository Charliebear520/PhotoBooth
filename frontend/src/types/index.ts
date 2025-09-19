// 基本型別
export type ImageItem = { image_base64: string };
export type GenerateResponse = { images: ImageItem[] };

// UI 階段
export type AppStep = "home" | "camera" | "compose" | "edit";

// 風格類型
export type BackgroundStyle = "清新日系" | "復古菲林" | "韓系膠片" | "黑白經典";
export type PhotoStyle = "皮克斯風格" | "原始照片" | "Q版公仔風格" | "動漫手繪風";

// 應用狀態
export interface AppState {
  step: AppStep;
  styledUrls: (string | null)[];
  collageDataUrl: string | null;
  stylizedUrl: string | null;
  loadingStyleKey: string | null;
  error: string | null;
  bgKey: BackgroundStyle | null;
  photoKey: PhotoStyle | null;
  customText: string;
  stream: MediaStream | null;
  currentPhotoIndex: number;
  countdown: number | null;
  isCapturing: boolean;
  capturedPhotos: (string | null)[];
}

