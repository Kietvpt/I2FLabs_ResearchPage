/**
 * Vercel Serverless Function: MCP Server-Sent Events (SSE) Endpoint
 * GET /api/sse or /sse
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createAevumMcpServer } from '../src/server.js';
import { requireMcpAuth } from '../src/auth.js';

// Cache active transports by session ID in-memory
export const activeTransports = new Map<string, SSEServerTransport>();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id, x-api-key, x-mcp-key',
    });
    res.end();
    return;
  }

  // Enforce MCP Authentication Key
  if (!(await requireMcpAuth(req, res))) {
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use GET for SSE stream.' }));
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const server = createAevumMcpServer();
  const transport = new SSEServerTransport('/api/messages', res);

  const sessionId = transport.sessionId;
  activeTransports.set(sessionId, transport);

  req.on('close', () => {
    activeTransports.delete(sessionId);
  });

  await server.connect(transport);
}
