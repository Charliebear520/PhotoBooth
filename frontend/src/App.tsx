import { useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

type ImageItem = { image_base64: string };

type GenerateResponse = { images: ImageItem[] };

function App() {
  const [prompt, setPrompt] = useState(
    "A cat in cyberpunk style, neon city, portrait"
  );
  const [count, setCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [sampleImageSize, setSampleImageSize] = useState("1K");
  const [personGeneration, setPersonGeneration] = useState("allow_adult");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const styleOptions = useMemo(
    () => [
      { key: "oil painting", label: "油畫" },
      { key: "cyberpunk", label: "賽博朋克" },
      { key: "watercolor", label: "水彩" },
      { key: "photorealistic", label: "寫實" },
      { key: "low poly", label: "低多邊形" },
      { key: "manga", label: "漫畫" },
    ],
    []
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const composedPrompt = useMemo(() => {
    const picked = selectedStyles.join(", ");
    const parts: string[] = [prompt.trim()];
    if (picked) parts.push(`Stylize in ${picked} style`);
    if (uploadedFile)
      parts.push(
        "Use the uploaded photo as reference for content and composition"
      );
    return parts.filter(Boolean).join(". ");
  }, [prompt, selectedStyles, uploadedFile]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImages([]);
    setNotice(null);
    try {
      let data: GenerateResponse;
      if (uploadedFile) {
        const form = new FormData();
        form.append("prompt", composedPrompt);
        form.append("number_of_images", String(count));
        if (aspectRatio) form.append("aspect_ratio", aspectRatio);
        if (sampleImageSize) form.append("sample_image_size", sampleImageSize);
        if (personGeneration)
          form.append("person_generation", personGeneration);
        form.append("model", "imagen-4.0-generate-001");
        form.append("image", uploadedFile);
        try {
          const res = await axios.post<GenerateResponse>("/api/stylize", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          data = res.data;
        } catch (err: any) {
          const msg: string =
            err?.response?.data?.detail?.error?.message ||
            err?.response?.data?.detail?.message ||
            err?.response?.data?.error?.message ||
            err?.message ||
            "";
          const lower = (msg || "").toLowerCase();
          const isImageUnsupported =
            lower.includes("image in input is not supported") ||
            lower.includes("not supported for this model");
          if (isImageUnsupported) {
            setNotice(
              "目前使用的模型不支援以圖生圖，已自動改為純文字風格化，結果可能無法保留人像身份。"
            );
            const res2 = await axios.post<GenerateResponse>("/api/generate", {
              prompt: composedPrompt,
              number_of_images: count,
              aspect_ratio: aspectRatio,
              sample_image_size: sampleImageSize,
              person_generation: personGeneration,
            });
            data = res2.data;
          } else {
            throw err;
          }
        }
      } else {
        const res = await axios.post<GenerateResponse>("/api/generate", {
          prompt: composedPrompt,
          number_of_images: count,
          aspect_ratio: aspectRatio,
          sample_image_size: sampleImageSize,
          person_generation: personGeneration,
        });
        data = res.data;
      }
      const list = data.images.map(
        (i) => `data:image/png;base64,${i.image_base64}`
      );
      setImages(list);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Unknown error";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>PhotoBooth — Imagen 風格轉換</h1>
      <p>參考 Google Gemini Imagen API 說明文件。</p>

      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ display: "grid", gap: 8 }}>
          <strong>上傳參考圖片（可選）</strong>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setUploadedFile(file);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
          />
          {previewUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setUploadedFile(null);
                  setPreviewUrl(null);
                }}
              >
                移除圖片
              </button>
            </div>
          )}
          <small style={{ color: "#666" }}>
            若選擇上傳，將把圖片透過後端送至模型做風格轉換（以圖生圖）。
          </small>
        </section>

        <label>
          提示（英文最佳）
          <textarea
            style={{ width: "100%", height: 100 }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <section style={{ display: "grid", gap: 8 }}>
          <strong>風格（可多選）</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {styleOptions.map((s) => {
              const active = selectedStyles.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setSelectedStyles((prev) =>
                      prev.includes(s.key)
                        ? prev.filter((k) => k !== s.key)
                        : [...prev, s.key]
                    )
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: active ? "1px solid #444" : "1px solid #ccc",
                    background: active ? "#efefef" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <small style={{ color: "#666" }}>
            我們會自動把你選擇的風格（英文關鍵詞）拼接到提示中：
            <code style={{ marginLeft: 6 }}>{`Stylize in ${
              selectedStyles.join(", ") || "(none)"
            } style`}</code>
          </small>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            數量
            <input
              type="number"
              min={1}
              max={4}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: 80 }}
            />
          </label>
          <label>
            比例
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </label>
          <label>
            尺寸
            <select
              value={sampleImageSize}
              onChange={(e) => setSampleImageSize(e.target.value)}
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
            </select>
          </label>
          <label>
            人物
            <select
              value={personGeneration}
              onChange={(e) => setPersonGeneration(e.target.value)}
            >
              <option value="dont_allow">dont_allow</option>
              <option value="allow_adult">allow_adult</option>
              <option value="allow_all">allow_all</option>
            </select>
          </label>
        </div>

        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "生成中…" : "生成圖片"}
        </button>

        {notice && (
          <div
            style={{
              color: "#8a6d3b",
              background: "#fcf8e3",
              padding: 8,
              border: "1px solid #faebcc",
            }}
          >
            {notice}
          </div>
        )}

        {error && (
          <div style={{ color: "red", whiteSpace: "pre-wrap" }}>
            錯誤：{error}
          </div>
        )}

        {images.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {images.map((src, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", padding: 8 }}>
                <img
                  src={src}
                  alt={`generated-${idx}`}
                  style={{ width: "100%" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
