/**
 * Vercel Serverless Function: Stateless Direct JSON-RPC Gateway
 * POST /api/rpc or /rpc or /mcp
 * Allows AI agents / curl to send direct JSON-RPC calls without maintaining persistent SSE.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { allTools } from '../src/tools/index.js';
import { allResources } from '../src/resources/index.js';
import { allPrompts } from '../src/prompts/index.js';
import { requireMcpAuth } from '../src/auth.js';

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-mcp-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Enforce MCP Authentication Key
  if (!(await requireMcpAuth(req, res))) {
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'I2FLabs Aevum MCP Server (JSON-RPC Gateway)',
        endpoints: {
          sse: '/sse',
          messages: '/messages',
          rpc: '/rpc',
        },
      })
    );
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);
    const { id, method, params } = body;

    // Handle MCP JSON-RPC methods
    if (method === 'tools/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            tools: allTools.map((t) => ({
              name: t.name,
              description: t.description,
            })),
          },
        })
      );
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = allTools.find((t) => t.name === toolName);

      if (!tool) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool "${toolName}" không tồn tại.` },
          })
        );
        return;
      }

      const parsedArgs = tool.parameters.parse(toolArgs);
      const result = await tool.handler(parsedArgs as any);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result,
        })
      );
      return;
    }

    if (method === 'resources/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            resources: allResources.map((r) => ({
              uri: r.uri,
              name: r.name,
              mimeType: r.mimeType,
            })),
          },
        })
      );
      return;
    }

    if (method === 'prompts/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: allPrompts.map((p) => ({
              name: p.name,
              description: p.description,
            })),
          },
        })
      );
      return;
    }

    // Default response for unhandled method
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method "${method}" not implemented.` },
      })
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: errorMsg },
      })
    );
  }
}
