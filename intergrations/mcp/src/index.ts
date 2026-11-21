/**
 * I2FLabs Aevum MCP Serverless Gateway
 * Standard Vercel Serverless Entrypoint (Node.js ESM)
 * 
 * Routes incoming HTTP requests to dedicated MCP handlers:
 * - GET  / or /api/index  -> Diagnostic & Tools Overview Console
 * - POST /rpc or /mcp     -> Stateless JSON-RPC Gateway (AI agents & MCP tools)
 * - GET  /sse             -> Server-Sent Events Transport
 * - POST /messages        -> SSE Message Receiver
 */
import type { IncomingMessage, ServerResponse } from 'http';
import indexHandler from '../api/index.js';
import sseHandler from '../api/sse.js';
import messagesHandler from '../api/messages.js';
import rpcHandler from '../api/rpc.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  const pathname = url.pathname;

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id, x-api-key, x-mcp-key',
    });
    res.end();
    return;
  }

  // 2. Route Dispatcher
  if (pathname === '/' || pathname === '/api' || pathname === '/api/index') {
    return indexHandler(req, res);
  }

  if (pathname === '/rpc' || pathname === '/api/rpc' || pathname === '/mcp') {
    return rpcHandler(req, res);
  }

  if (pathname === '/sse' || pathname === '/api/sse') {
    return sseHandler(req, res);
  }

  if (pathname === '/messages' || pathname === '/api/messages') {
    return messagesHandler(req, res);
  }

  // 3. Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify(
      {
        error: `Route ${pathname} not found on I2FLabs Aevum MCP Gateway`,
        availableEndpoints: {
          console: '/',
          rpc: '/rpc',
          mcp: '/mcp',
          sse: '/sse',
          messages: '/messages',
        },
      },
      null,
      2
    )
  );
}

export { createAevumMcpServer } from './createMcpServer.js';
export * from './tools/index.js';
export * from './resources/index.js';
export * from './prompts/index.js';
