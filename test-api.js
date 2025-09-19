// 简单的API测试脚本
// 在浏览器控制台中运行此脚本来测试API端点

async function testAPI() {
  const baseUrl = window.location.origin;

  console.log("Testing API endpoints...");

  // 测试健康检查
  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }

  // 测试调试端点
  try {
    const debugResponse = await fetch(`${baseUrl}/api/debug`);
    const debugData = await debugResponse.json();
    console.log("✅ Debug info:", debugData);

    // 特别显示API密钥状态
    console.log("🔑 API密钥状态:");
    console.log(
      `   GEMINI_API_KEY: ${
        debugData.gemini_api_key_set ? "✅ 已设置" : "❌ 未设置"
      }`
    );
    console.log(`   GEMINI密钥预览: ${debugData.gemini_key_preview}`);
    console.log(`   GEMINI密钥长度: ${debugData.gemini_key_length}`);
    console.log(`   环境: ${debugData.environment}`);
    console.log(`   Vercel区域: ${debugData.vercel_region}`);
  } catch (error) {
    console.error("❌ Debug endpoint failed:", error);
  }

  // 测试生成端点
  try {
    const generateResponse = await fetch(`${baseUrl}/api/test-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const generateData = await generateResponse.json();
    console.log("✅ Test generate:", generateData);
  } catch (error) {
    console.error("❌ Test generate failed:", error);
  }
}

// 运行测试
testAPI();
