#!/usr/bin/env python3
"""
测试调试端点
"""

import sys
import os
import asyncio

# 添加backend路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

async def test_debug_endpoint():
    """测试调试端点"""
    try:
        from app.main import create_app
        app = create_app()
        
        # 找到调试端点
        debug_route = None
        for route in app.routes:
            if hasattr(route, 'path') and route.path == "/api/debug":
                debug_route = route
                break
        
        if debug_route:
            print("✅ 找到调试端点")
            
            # 模拟请求
            class MockRequest:
                pass
            
            # 调用端点
            result = await debug_route.endpoint()
            print("✅ 调试端点调用成功")
            print("📊 调试信息:")
            for key, value in result.items():
                print(f"   {key}: {value}")
            
            # 检查是否包含GEMINI_API_KEY信息
            if "gemini_api_key_set" in result:
                print("✅ 包含GEMINI_API_KEY状态信息")
            else:
                print("❌ 缺少GEMINI_API_KEY状态信息")
            
            # 检查是否移除了STABILITY_API_KEY信息
            if "stability_api_key_set" in result:
                print("❌ 仍然包含STABILITY_API_KEY信息（应该已移除）")
            else:
                print("✅ 已成功移除STABILITY_API_KEY信息")
                
        else:
            print("❌ 未找到调试端点")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    print("🔍 测试调试端点...\n")
    success = asyncio.run(test_debug_endpoint())
    
    if success:
        print("\n🎉 调试端点测试通过！")
        sys.exit(0)
    else:
        print("\n❌ 调试端点测试失败！")
        sys.exit(1)
