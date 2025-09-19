import sys
import os
from pathlib import Path

# 添加backend路径到Python路径
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# 导入后端应用
from app.main import create_app
from mangum import Mangum

# 创建FastAPI应用
app = create_app()

# 创建Mangum处理器用于Vercel
handler = Mangum(app)