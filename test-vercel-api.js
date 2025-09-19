// 测试Vercel部署的API端点
const API_BASE = "https://photo-booth-blue-one.vercel.app";

async function testAPI() {
  console.log("🔍 开始测试API端点...");

  try {
    // 测试健康检查
    console.log("\n1. 测试健康检查端点...");
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    console.log("健康检查状态码:", healthResponse.status);
    const healthText = await healthResponse.text();
    console.log("健康检查响应:", healthText);

    let healthData;
    try {
      healthData = JSON.parse(healthText);
      console.log("健康检查解析结果:", healthData);
    } catch (e) {
      console.log("健康检查响应不是JSON格式");
    }

    // 测试调试端点
    console.log("\n2. 测试调试端点...");
    const debugResponse = await fetch(`${API_BASE}/api/debug`);
    console.log("调试端点状态码:", debugResponse.status);
    const debugText = await debugResponse.text();
    console.log("调试端点响应:", debugText);

    let debugData;
    try {
      debugData = JSON.parse(debugText);
      console.log("调试信息解析结果:", debugData);
    } catch (e) {
      console.log("调试端点响应不是JSON格式");
    }

    // 测试简单的生成请求
    console.log("\n3. 测试简单生成请求...");
    const generateResponse = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "a simple red circle",
        number_of_images: 1,
      }),
    });

    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log("生成请求成功:", generateData);
    } else {
      const errorText = await generateResponse.text();
      console.error("生成请求失败:", generateResponse.status, errorText);
    }
  } catch (error) {
    console.error("测试过程中发生错误:", error);
  }
}

// 运行测试
testAPI();
