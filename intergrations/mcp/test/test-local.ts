/**
 * Test script for local MCP server & Aevum OS Bridge
 * Run: npx tsx test/test-local.ts
 */
import { allTools } from '../src/tools/index.js';
import { allResources } from '../src/resources/index.js';
import { CONFIG } from '../src/config.js';
import { validateMcpAuth } from '../src/auth.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 I2FLabs Aevum MCP Server - Kiểm Tra Kết Nối & Xác Thực');
  console.log('====================================================\n');

  console.log(`📡 Cấu hình Aevum Local URL: ${CONFIG.aevum.defaultLocalUrl}`);
  console.log(`🔐 Master MCP API Key     : ${CONFIG.auth.masterApiKey.slice(0, 14)}...`);
  console.log(`🗄️  Supabase URL           : ${CONFIG.supabase.url}`);
  console.log(`🛠️  Số lượng Tools đã đăng ký: ${allTools.length}\n`);

  // Test 1: Authentication Validation Check
  console.log('--- Test 1: Kiểm định Authentication Key ---');
  // 1a. Thiếu key
  const mockReqNoKey = { headers: {}, url: '/sse' } as any;
  const noKeyResult = await validateMcpAuth(mockReqNoKey);
  console.log(`  - Không gửi key: Authenticated = ${noKeyResult.authenticated} (${noKeyResult.error})`);

  // 1b. Gửi key sai
  const mockReqBadKey = { headers: { authorization: 'Bearer invalid_key_123' }, url: '/sse' } as any;
  const badKeyResult = await validateMcpAuth(mockReqBadKey);
  console.log(`  - Gửi key sai: Authenticated = ${badKeyResult.authenticated} (${badKeyResult.error})`);

  // 1c. Gửi key đúng qua Header
  const mockReqValidHeader = {
    headers: { authorization: `Bearer ${CONFIG.auth.masterApiKey}` },
    url: '/sse',
  } as any;
  const validHeaderResult = await validateMcpAuth(mockReqValidHeader);
  console.log(`  - Gửi key đúng (Header): Authenticated = ${validHeaderResult.authenticated} (${validHeaderResult.keyName})`);

  // 1d. Gửi key đúng qua Query Param (?apiKey=...)
  const mockReqValidQuery = {
    headers: {},
    url: `/sse?apiKey=${CONFIG.auth.masterApiKey}`,
  } as any;
  const validQueryResult = await validateMcpAuth(mockReqValidQuery);
  console.log(`  - Gửi key đúng (Query Param): Authenticated = ${validQueryResult.authenticated} (${validQueryResult.keyName})`);

  // Test 2: Probe local Aevum OS
  console.log('\n--- Test 2: Thực thi aevum_probe_local ---');
  const probeTool = allTools.find((t) => t.name === 'aevum_probe_local');
  if (probeTool) {
    const probeRes = await (probeTool.handler as any)({ timeoutMs: 2500 });
    console.log(probeRes.content[0].text);
  }

  // Test 3: Handshake
  console.log('\n--- Test 3: Thực thi aevum_bridge_handshake ---');
  const handshakeTool = allTools.find((t) => t.name === 'aevum_bridge_handshake');
  if (handshakeTool) {
    const handshakeRes = await (handshakeTool.handler as any)({ clientName: 'Admin-Test-Runner' });
    console.log(handshakeRes.content[0].text);
  }

  // Test 4: List Research Domains (Supabase Live / Sync)
  console.log('\n--- Test 4: Thực thi i2f_list_research_domains (Đồng bộ DB thực tế) ---');
  const domainsTool = allTools.find((t) => t.name === 'i2f_list_research_domains');
  if (domainsTool) {
    const domainsRes = await (domainsTool.handler as any)({});
    console.log(domainsRes.content[0].text);
  }

  // Test 5: Query Live Reports from Supabase
  console.log('\n--- Test 5: Thực thi i2f_query_research_reports (Tra cứu báo cáo live) ---');
  const reportsTool = allTools.find((t) => t.name === 'i2f_query_research_reports');
  if (reportsTool) {
    const reportsRes = await (reportsTool.handler as any)({ limit: 3 });
    console.log(reportsRes.content[0].text);
  }

  // Test 6: Read MCP Resource: i2f://reports/recent
  console.log('\n--- Test 6: Đọc MCP Resource "i2f://reports/recent" ---');
  const recentResource = allResources.find((r) => r.uri === 'i2f://reports/recent');
  if (recentResource) {
    const resData = await recentResource.read();
    console.log(resData.contents[0].text);
  }

  console.log('\n✅ Hoàn tất bài test kiểm tra tích hợp & Authentication Key.');
}

runTests().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
