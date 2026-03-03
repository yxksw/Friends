// functions/friends.ts

interface RequestContext {
  request: Request;
}

export async function onRequest({ request }: RequestContext): Promise<Response> {
  const origin = request.headers.get("Origin") || "*";

  // 代理到静态文件 /data/friends.json
  const response = await fetch("https://friends-api.050815.xyz/data/friends.json");

  // 克隆响应并添加 CORS 头
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  // 设置 CORS 响应头
  newResponse.headers.set("Access-Control-Allow-Origin", origin);
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");
  newResponse.headers.set("Access-Control-Max-Age", "86400");

  // 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  return newResponse;
}
