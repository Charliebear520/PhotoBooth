def handler(request, response):
    """最基本的Vercel Python函数"""
    try:
        # 设置CORS头
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Content-Type'] = 'application/json'
        
        # 获取请求路径
        path = request.path if hasattr(request, 'path') else '/'
        
        if path == '/api/health':
            response.status_code = 200
            return '{"status": "ok"}'
        elif path == '/':
            response.status_code = 200
            return '{"message": "Hello World"}'
        else:
            response.status_code = 404
            return '{"error": "Not found"}'
            
    except Exception as e:
        response.status_code = 500
        return f'{{"error": "Internal server error: {str(e)}"}}'
