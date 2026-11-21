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
import { zodToJsonSchema } from '../src/schemaHelper.js';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id, x-api-key, x-mcp-key');

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
        service: 'I2FLabs Aevum MCP Server (Stateless JSON-RPC Gateway)',
        version: '1.0.0',
        deployment: 'Vercel Serverless',
        endpoints: {
          rpc: '/rpc',
          mcp: '/mcp',
          sse: '/sse',
          messages: '/messages',
        },
        supportedMethods: [
          'initialize',
          'notifications/initialized',
          'ping',
          'tools/list',
          'tools/call',
          'resources/list',
          'resources/read',
          'prompts/list',
          'prompts/get',
        ],
      })
    );
    return;
  }

  let body: any;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch (err: unknown) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON payload' },
      })
    );
    return;
  }

  try {
    const { id, method, params } = body;
    const reqId = id !== undefined ? id : null;

    // 1. Initialize Handshake (Standard MCP Protocol)
    if (method === 'initialize') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            protocolVersion: params?.protocolVersion || '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: 'i2flabs-aevum-mcp',
              version: '1.0.0',
            },
          },
        })
      );
      return;
    }

    // 2. Initialized Notification
    if (method === 'notifications/initialized') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: reqId, result: {} }));
      return;
    }

    // 3. Ping
    if (method === 'ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: reqId, result: {} }));
      return;
    }

    // 4. Tools: List
    if (method === 'tools/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            tools: allTools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: zodToJsonSchema(t.parameters),
            })),
          },
        })
      );
      return;
    }

    // 5. Tools: Call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = allTools.find((t) => t.name === toolName);

      if (!tool) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32601, message: `Tool "${toolName}" không tồn tại trên máy chủ MCP.` },
          })
        );
        return;
      }

      const parseResult = tool.parameters.safeParse(toolArgs);
      if (!parseResult.success) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: false,
                      error: `Tham số không hợp lệ cho tool [${toolName}]`,
                      issues: parseResult.error.format(),
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            },
          })
        );
        return;
      }

      try {
        const result = await tool.handler(parseResult.data as any);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            result,
          })
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: errorMsg }, null, 2),
                },
              ],
              isError: true,
            },
          })
        );
      }
      return;
    }

    // 6. Resources: List
    if (method === 'resources/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            resources: allResources.map((r) => ({
              uri: r.uri,
              name: r.name,
              mimeType: r.mimeType,
              description: r.description,
            })),
          },
        })
      );
      return;
    }

    // 7. Resources: Read
    if (method === 'resources/read') {
      const uri = params?.uri;
      const resource = allResources.find((r) => r.uri === uri);

      if (!resource) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32602, message: `Resource "${uri}" không tồn tại.` },
          })
        );
        return;
      }

      const result = await resource.read();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result,
        })
      );
      return;
    }

    // 8. Prompts: List
    if (method === 'prompts/list') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            prompts: allPrompts.map((p) => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments,
            })),
          },
        })
      );
      return;
    }

    // 9. Prompts: Get
    if (method === 'prompts/get') {
      const promptName = params?.name;
      const prompt = allPrompts.find((p) => p.name === promptName);

      if (!prompt) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32602, message: `Prompt "${promptName}" không tồn tại.` },
          })
        );
        return;
      }

      const result = prompt.generate(params?.arguments || {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId,
          result,
        })
      );
      return;
    }

    // Fallback for unhandled method
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
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
