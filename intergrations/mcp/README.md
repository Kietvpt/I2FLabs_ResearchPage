# 🌐 I2FLabs Aevum MCP Server (Vercel-Ready Gateway)

> **Máy chủ Model Context Protocol (MCP)** triển khai trên **Vercel Serverless**, thiết lập giao thức tương tác 2 chiều giữa **Hệ thống Nghiên cứu I2FLabs** trên đám mây và **Aevum OS cục bộ** của các Admin.

---

## 🎯 Mục Tiêu & Kiến Trúc

```
┌─────────────────────────────────┐           ┌──────────────────────────────────────┐
│       AI Agent / LLM Client     │           │         I2FLabs Research Page        │
│  (Claude, Antigravity, Cursor)  │           │      (Supabase + CMS + Reader)       │
└────────────────┬────────────────┘           └──────────────────┬───────────────────┘
                 │                                               │
                 ▼                                               ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │             I2FLabs Aevum MCP Server (Vercel Serverless)               │
   │   - GET  /sse        : Server-Sent Events Stream                       │
   │   - POST /messages   : JSON-RPC 2.0 Message Dispatcher                 │
   │   - POST /rpc        : Stateless Direct Execution                      │
   │   - GET  /           : Interactive Health & Schema Dashboard           │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       │ (SSE / HTTP Relay)
                                       ▼
                     ┌───────────────────────────────────┐
                     │     Aevum OS Local Daemon         │
                     │    http://127.0.0.1:3344/sse      │
                     │    (An, Vidus, Nia, Kai, Zenith)  │
                     └───────────────────────────────────┘
```

1. **Thử nghiệm kết nối đám mây ↔ local**: Cho phép AI trên nền tảng đám mây (hoặc các admin làm việc từ xa) kiểm tra trạng thái máy chủ Aevum OS local của admin (`aevum_probe_local`).
2. **Khởi tạo bắt tay giao thức (Handshake)**: Trao đổi ngữ cảnh Workspace, kích hoạt 44 công cụ đa hình của Aevum OS (`aevum_bridge_handshake`).
3. **Ủy quyền & Điều phối Squad**: Gửi nhiệm vụ trực tiếp đến các Persona (An, Vidus, Zenith, Luna) trong Aevum OS Squad (`aevum_relay_task`).
4. **Tích hợp Kho học thuật I2FLabs**: Tra cứu danh mục miền nghiên cứu, tìm kiếm báo cáo và cho phép Aevum OS tự động xuất bản kết quả nghiên cứu RDD lên CMS (`i2f_publish_paper`).
5. **Telemetry & Dòng chảy (Flow State)**: Thu nạp các chỉ số nhịp làm việc Cadence 50/10, đo đạc độ trễ sub-300ms của kỹ sư (`aevum_ingest_cadence_telemetry`).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### 1. Cài đặt Dependencies
```bash
cd "d:\I2FLabs Vietnam\I2FLabs_ResearchPage\intergrations\mcp"
npm install
```

### 2. Chạy thử nghiệm kết nối Local (Test Script)
Đảm bảo Aevum OS hoặc VS Code Aevum Extension đang mở (cổng mặc định `3344`):
```bash
npm run test:local
```

### 3. Khởi chạy ở chế độ Stdio (Dành cho Claude Desktop / Antigravity CLI)
```bash
npm start
```

---

## ☁️ Hướng Dẫn Triển Khai Lên Vercel

### Cách 1: Sử dụng Vercel CLI
```bash
# Đăng nhập Vercel (nếu chưa)
npx vercel login

# Triển khai dự án MCP từ thư mục integrations/mcp
cd "d:\I2FLabs Vietnam\I2FLabs_ResearchPage\intergrations\mcp"
npx vercel --prod
```

### Cách 2: Triển khai từ GitHub Repository
1. Kết nối repo `I2FLabs_ResearchPage` trên Vercel Dashboard.
2. Trong phần **Project Settings**:
   - **Root Directory**: `intergrations/mcp`
   - **Build Command**: `npm run build`
   - **Output Directory**: Bỏ trống (mặc định cho Vercel Serverless Functions)
3. Điền các biến môi trường từ tệp `.env.example`:
   - `AEVUM_LOCAL_URL`: URL public nếu có dùng tunnel (vd: Ngrok, Cloudflare Tunnel) hoặc để mặc định `http://127.0.0.1:3344`.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## 🔌 Cấu Hình Client Kết Nối Đến MCP Server

### 1. Cấu hình Antigravity / Aevum OS
Thêm vào `.gemini/antigravity/mcp_config.json` hoặc `.aevum/mcp_config.json`:
```json
{
  "mcpServers": {
    "i2flabs-aevum-gateway": {
      "command": "node",
      "args": [
        "D:/I2FLabs Vietnam/I2FLabs_ResearchPage/intergrations/mcp/dist/src/cli.js"
      ]
    }
  }
}
```

### 2. Cấu hình Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "i2flabs-aevum-gateway": {
      "command": "node",
      "args": [
        "D:/I2FLabs Vietnam/I2FLabs_ResearchPage/intergrations/mcp/dist/src/cli.js"
      ],
      "env": {
        "MCP_API_KEY": "i2f_mcp_live_sec_7f9a2b1c4e88"
      }
    }
  }
}
```

Hoặc khi đã deploy lên Vercel (kèm Authentication Key):
```json
{
  "mcpServers": {
    "i2flabs-aevum-cloud": {
      "url": "https://your-mcp-server.vercel.app/sse?apiKey=i2f_mcp_live_sec_7f9a2b1c4e88"
    }
  }
}
```

---

## 🔐 Cơ Chế Xác Thực (Authentication Key)

Mọi yêu cầu kết nối đến máy chủ MCP (qua SSE, POST Messages, hay RPC) đều bắt buộc phải có Authentication Key hợp lệ:
1. **Header HTTP**:
   - `Authorization: Bearer <MCP_API_KEY>`
   - hoặc `x-api-key: <MCP_API_KEY>`
2. **Query Parameter (dành cho EventSource / Web Browser SSE)**:
   - `https://your-mcp-server.vercel.app/sse?apiKey=<MCP_API_KEY>`
3. **Quản lý Khóa**:
   - Khóa quản trị Master: `MCP_API_KEY=i2f_mcp_live_sec_7f9a2b1c4e88` trong tệp `.env`.
   - Cơ sở dữ liệu Supabase: Bảng `mcp_api_keys` (Migration `005_mcp_api_keys.sql`) cho phép tạo, thu hồi và phân quyền từng Key theo tên Agent hoặc Admin.

---

## 🛠️ Danh Sách Công Cụ (Tools) Đã Cung Cấp

| Tên Tool | Mô Tả |
| :--- | :--- |
| `aevum_probe_local` | Kiểm tra kết nối và đo độ trễ roundtrip đến Aevum OS local (`http://127.0.0.1:3344/sse`). |
| `aevum_bridge_handshake` | Bắt tay giao thức Polymorphic v2.0, nhận diện các Squad Personas và Core Tools. |
| `aevum_relay_task` | Đóng gói và chuyển tiếp nhiệm vụ đến AI Persona mục tiêu (An, Vidus, Nia, Kai, Zenith, Luna). |
| `i2f_list_research_domains` | Lấy danh sách 5 Đại phân vùng nghiên cứu chiến lược viện I2FLabs. |
| `i2f_query_research_reports` | Tra cứu báo cáo khoa học, whitepaper, telemetry benchmark trong CMS. |
| `i2f_publish_paper` | Xuất bản bài báo cáo nghiên cứu từ Aevum OS trực tiếp vào trang nghiên cứu I2FLabs. |
| `aevum_ingest_cadence_telemetry` | Nạp dữ liệu phiên làm việc Cadence 50/10 và phân tích ngưỡng đứt gãy Flow 300ms. |
| `aevum_get_flow_benchmark` | Truy xuất bảng chỉ số đối sánh dòng chảy khoa học giữa làm việc độc lập vs AI cộng tác. |

---

## 📚 Resources & Prompts

- **Resources**:
  - `aevum://system/status`: Trạng thái nút Aevum OS local.
  - `i2f://domains/list`: Toàn văn danh mục các viện và phân ban nghiên cứu.
- **Prompts**:
  - `cadence_flow_audit`: Kịch bản đánh giá tải nhận thức và chu kỳ 50/10.
  - `research_peer_review`: Kịch bản tranh biện phản biện học thuật giữa Vidus và An.

---
*Phát triển bởi Viện Nghiên cứu Trí tuệ Nhân tạo & Kiến trúc Nhận thức I2FLabs.*
