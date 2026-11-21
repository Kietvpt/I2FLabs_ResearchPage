/**
 * Local Standalone HTTP / SSE Server for I2FLabs Aevum MCP
 * Run: npm run serve (runs on http://127.0.0.1:3300)
 */
import http from 'http';
import { CONFIG } from './config.js';
import indexHandler from '../api/index.js';
import sseHandler from '../api/sse.js';
import messagesHandler from '../api/messages.js';
import rpcHandler from '../api/rpc.js';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/' || pathname === '/api' || pathname === '/api/index') {
      await indexHandler(req, res);
      return;
    }

    if (pathname === '/sse' || pathname === '/api/sse') {
      await sseHandler(req, res);
      return;
    }

    if (pathname === '/messages' || pathname === '/api/messages') {
      await messagesHandler(req, res);
      return;
    }

    if (pathname === '/rpc' || pathname === '/api/rpc' || pathname === '/mcp') {
      await rpcHandler(req, res);
      return;
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Route ${pathname} not found` }));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Server Error] ${req.method} ${pathname}:`, err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: errorMsg }));
    }
  }
});

const port = CONFIG.server.port;
server.listen(port, '0.0.0.0', () => {
  console.log('===========================================================');
  console.log(`🚀 I2FLabs Aevum MCP Server đang chạy tại: http://localhost:${port}`);
  console.log('===========================================================');
  console.log(`- Dashboard Console : http://localhost:${port}/`);
  console.log(`- SSE Endpoint      : http://localhost:${port}/sse`);
  console.log(`- Message Receiver  : http://localhost:${port}/messages`);
  console.log(`- JSON-RPC Direct   : http://localhost:${port}/rpc`);
  console.log(`- Target Aevum Local: ${CONFIG.aevum.defaultLocalUrl}`);
  console.log('-----------------------------------------------------------');
  console.log('Nhấn Ctrl+C để dừng máy chủ.\n');
});
