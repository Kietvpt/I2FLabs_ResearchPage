/**
 * Vercel Serverless Function: Home & Diagnostics Console
 * GET / or GET /api/index
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { allTools } from '../src/tools/index.js';
import { allResources } from '../src/resources/index.js';
import { allPrompts } from '../src/prompts/index.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>I2FLabs Aevum MCP Server</title>
  <style>
    :root {
      --bg: #0c0e12;
      --card: #15181f;
      --border: #242933;
      --text: #f0f2f5;
      --muted: #8b949e;
      --accent: #ffffff;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 2.5rem 1.5rem;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      font-family: var(--mono);
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: #1f242c;
      border: 1px solid var(--border);
      color: var(--muted);
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.8rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    p.subtitle { color: var(--muted); font-size: 0.95rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }
    .card h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--mono); color: var(--muted); margin-bottom: 0.5rem; }
    .card .val { font-size: 1.5rem; font-weight: 600; font-family: var(--mono); }
    .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    ul { list-style: none; }
    li.item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.85rem 1rem;
      margin-bottom: 0.75rem;
    }
    .item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem; }
    .item-name { font-family: var(--mono); font-size: 0.9rem; font-weight: 600; color: #fff; }
    .item-desc { font-size: 0.85rem; color: var(--muted); }
    .endpoints {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: var(--mono);
      font-size: 0.85rem;
      margin-bottom: 2rem;
    }
    .endpoints div { margin-bottom: 0.4rem; }
    .method { color: #58a6ff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="badge">I2FLabs Institute • MCP Protocol Gateway v1.0.0</div>
  <h1>Aevum OS MCP Gateway</h1>
  <p class="subtitle">Máy chủ giao thức Model Context Protocol triển khai trên Vercel, kết nối đám mây và Aevum OS local của các Admin.</p>

  <div class="grid">
    <div class="card">
      <h3>Active Tools</h3>
      <div class="val">${allTools.length}</div>
    </div>
    <div class="card">
      <h3>Resources</h3>
      <div class="val">${allResources.length}</div>
    </div>
    <div class="card">
      <h3>Dialectic Prompts</h3>
      <div class="val">${allPrompts.length}</div>
    </div>
  </div>

  <h2 class="section-title">Giao thức Endpoint Kết Nối & Xác Thực</h2>
  <div class="endpoints">
    <div><span class="method">GET</span> /sse?apiKey=&lt;key&gt; — Server-Sent Events Endpoint (SSE Transport)</div>
    <div><span class="method">POST</span> /messages?sessionId=&lt;id&gt;&apiKey=&lt;key&gt; — Message Receiver (JSON-RPC 2.0)</div>
    <div><span class="method">POST</span> /rpc (Header: Authorization: Bearer &lt;key&gt;) — Direct Stateless JSON-RPC Gateway</div>
    <div style="margin-top: 0.8rem; color: #8b949e; border-top: 1px dashed var(--border); padding-top: 0.5rem;">
      🔐 <strong>Authentication Key:</strong> Bắt buộc gửi qua header <code>Authorization: Bearer &lt;key&gt;</code> hoặc query param <code>?apiKey=&lt;key&gt;</code>.
    </div>
  </div>

  <h2 class="section-title">Danh sách Công cụ MCP Khả Dụng</h2>
  <ul>
    ${allTools
      .map(
        (t) => `
      <li class="item">
        <div class="item-header">
          <span class="item-name">${t.name}</span>
        </div>
        <p class="item-desc">${t.description}</p>
      </li>
    `
      )
      .join('')}
  </ul>
</body>
</html>`;

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(html);
}
