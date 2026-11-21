# Domain: mcp_aevum_gateway (Agent Swarm Mesh)

## Context
Giao thức tương tác liên tác tử (Model Context Protocol - MCP) phục vụ kết nối hai chiều giữa cổng thông tin nghiên cứu I2FLabs và hệ điều hành tác tử Aevum OS local của các admin/nghiên cứu viên, triển khai tương thích trên Vercel Serverless Runtime.

## Bounded Context
- **Owns:**
  - Serverless MCP endpoints: `/sse`, `/messages`, `/rpc` (Direct JSON-RPC).
  - Cầu nối bắt tay Aevum OS Polymorphic v2.0 Handshake (`aevum_bridge_handshake`).
  - Hệ thống xác thực Authentication Key kép (Master ENV + Supabase Token Table).
  - Bộ đo lường nhịp độ cộng tác AI Telemetry Cadence 50/10.
- **Depends On:**
  - `@modelcontextprotocol/sdk`, `zod`, `dotenv`.
  - `core_platform` (truy vấn cơ sở dữ liệu Supabase).
- **Exposes:**
  - Endpoint Vercel Serverless `/rpc` và `/sse`.
  - Stdio CLI `dist/src/cli.js` cho Aevum OS và IDE.

## Tech Stack
- **Language:** TypeScript (NodeNext / ES2022)
- **Runtime:** Vercel Serverless Functions / Node.js Local Daemon
- **Key Files:** `intergrations/mcp/vercel.json`, `intergrations/mcp/src/server.ts`, `intergrations/mcp/src/auth.ts`
