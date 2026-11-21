/**
 * Root Server Entrypoint for Vercel Deployment from /intergrations
 */
import handler from './mcp/api/index.js';
export * from './mcp/src/server.js';
export default handler;
