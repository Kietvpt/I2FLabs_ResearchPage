#!/usr/bin/env node
/**
 * Stdio entrypoint for Claude Desktop, VS Code, and terminal MCP runners
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAevumMcpServer } from './server.js';

async function main() {
  const server = createAevumMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('[I2FLabs Aevum MCP Server] Chạy trên giao thức Stdio.');
}

main().catch((err) => {
  console.error('[Fatal Error]:', err);
  process.exit(1);
});
