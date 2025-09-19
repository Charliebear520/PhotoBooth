import React from "react";

interface HomeProps {
  onStart: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#2d3748",
            marginBottom: "20px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          IUI LAB PHOTOBOOTH
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "#4a5568",
            lineHeight: "1.6",
            marginBottom: "30px",
          }}
        >
          準備好擺出最棒的姿勢了嗎？點擊下方按鈕，開始創造你的專屬回憶！
        </p>

        <button
          onClick={onStart}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "50px",
            padding: "16px 40px",
            fontSize: "1.2rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 10px 20px rgba(102, 126, 234, 0.3)",
            transition: "all 0.3s ease",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          開始體驗
        </button>
      </div>
    </div>
  );
};

