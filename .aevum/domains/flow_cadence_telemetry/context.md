# Domain: flow_cadence_telemetry (Neuro-Cognitive Quality Lab)

## Context
Phòng thí nghiệm đo lường nhịp độ cộng tác Human–AI theo chuẩn Aevum Cadence 50/10 (50 phút Deep Flow, 10 phút Reflection/Rest), giám sát ngưỡng độ trễ dưới 300ms, và đảm bảo chất lượng toàn vẹn bản build phần mềm.

## Bounded Context
- **Owns:**
  - Thu nạp telemetry phiên làm việc (`aevum_ingest_cadence_telemetry`).
  - Phân tích độ trễ P50/P95 và tần suất đứt gãy mạch tập trung (Flow Interruptions).
  - Kiểm thử tự động tính toàn vẹn mã nguồn và bản build production (`npm run build`).
- **Depends On:**
  - `mcp_aevum_gateway`, `core_platform`.
- **Exposes:**
  - Các công cụ MCP đo lường Telemetry (`telemetryTools`).
  - Báo cáo Benchmark trạng thái dòng chảy.

## Tech Stack
- **Engines:** Tsx, TypeScript, Vite Compiler, Vitest/Node Test Runner
- **Key Files:** `intergrations/mcp/src/tools/telemetry.ts`, `intergrations/mcp/test/test-local.ts`
