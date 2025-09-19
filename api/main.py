import sys
import os

# 添加backend路径到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app

# Vercel serverless function entry point
handler = app
