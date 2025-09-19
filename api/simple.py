def handler(request):
    """简单的Vercel函数处理器"""
    try:
        # 获取请求路径
        path = request.get('path', '/')
        
        if path == '/api/health':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                'body': '{"status": "ok"}'
            }
        elif path == '/':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': '{"message": "Hello World"}'
            }
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                },
                'body': '{"error": "Not found"}'
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': f'{{"error": "Internal server error: {str(e)}"}}'
        }
