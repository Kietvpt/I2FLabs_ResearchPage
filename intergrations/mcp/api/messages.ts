/**
 * Vercel Serverless Function: MCP Message Handler (SSE pairing)
 * POST /api/messages?sessionId=... or /messages
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { activeTransports } from './sse.js';
import { requireMcpAuth } from '../src/auth.js';

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

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST for MCP messages.' }));
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const sessionId = url.searchParams.get('sessionId') || (req.headers['x-session-id'] as string);

  if (!sessionId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing sessionId in query string or x-session-id header' }));
    return;
  }

  const transport = activeTransports.get(sessionId);

  if (!transport) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: `Session ${sessionId} not found or expired. Re-initiate SSE at /sse.`,
      })
    );
    return;
  }

  await transport.handlePostMessage(req, res);
}
