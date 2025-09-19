import sys
import os

# 添加backend路径到Python路径
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

try:
    from app.main import app
    print(f"Successfully imported app from {backend_path}")
except ImportError as e:
    print(f"Import error: {e}")
    print(f"Python path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in current dir: {os.listdir('.')}")
    raise

# Vercel serverless function entry point
handler = app
