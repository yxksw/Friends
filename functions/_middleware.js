export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  
  // 只对 /data/ 路径添加 CORS
  if (url.pathname.startsWith('/data/')) {
    const response = await next();
    
    // 克隆响应
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    // 添加 CORS 头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    return newResponse;
  }
  
  return next();
}