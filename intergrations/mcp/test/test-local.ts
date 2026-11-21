/**
 * Test script for local MCP server & Aevum OS Bridge
 * Run: npx tsx test/test-local.ts
 */
import { EventEmitter } from 'events';
import { allTools } from '../src/tools/index.js';
import { allResources } from '../src/resources/index.js';
import { CONFIG } from '../src/config.js';
import { validateMcpAuth } from '../src/auth.js';
import rpcHandler from '../api/rpc.js';

function mockRpcCall(body: any, token: string = CONFIG.auth.masterApiKey): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as any;
    req.method = 'POST';
    req.url = '/rpc';
    req.headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };

    let responseData = '';
    let statusCode = 200;

    const res = {
      setHeader: () => {},
      writeHead: (code: number) => {
        statusCode = code;
      },
      end: (data: string) => {
        responseData = data;
        let parsed = {};
        try {
          parsed = JSON.parse(responseData || '{}');
        } catch {
          parsed = { raw: responseData };
        }
        resolve({ status: statusCode, data: parsed });
      },
    } as any;

    rpcHandler(req, res);

    setTimeout(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    }, 10);
  });
}

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
  const mockReqNoKey = { headers: {}, url: '/sse' } as any;
  const noKeyResult = await validateMcpAuth(mockReqNoKey);
  console.log(`  - Không gửi key: Authenticated = ${noKeyResult.authenticated} (${noKeyResult.error})`);

  const mockReqBadKey = { headers: { authorization: 'Bearer invalid_key_123' }, url: '/sse' } as any;
  const badKeyResult = await validateMcpAuth(mockReqBadKey);
  console.log(`  - Gửi key sai: Authenticated = ${badKeyResult.authenticated} (${badKeyResult.error})`);

  const mockReqValidHeader = {
    headers: { authorization: `Bearer ${CONFIG.auth.masterApiKey}` },
    url: '/sse',
  } as any;
  const validHeaderResult = await validateMcpAuth(mockReqValidHeader);
  console.log(`  - Gửi key đúng (Header): Authenticated = ${validHeaderResult.authenticated} (${validHeaderResult.keyName})`);

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

  // Test 7: Vercel Stateless JSON-RPC Gateway (/api/rpc) Methods
  console.log('\n--- Test 7: Kiểm thử Stateless JSON-RPC Gateway (/api/rpc) ---');

  // 7a. initialize
  const initRes = await mockRpcCall({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' },
  });
  console.log('  - method: initialize ->', initRes.data.result?.serverInfo?.name, '(Protocol:', initRes.data.result?.protocolVersion, ')');

  // 7b. ping
  const pingRes = await mockRpcCall({ jsonrpc: '2.0', id: 2, method: 'ping' });
  console.log('  - method: ping -> status 200, result =', JSON.stringify(pingRes.data.result));

  // 7c. tools/list (verify inputSchema)
  const listToolsRes = await mockRpcCall({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  const tools = listToolsRes.data.result?.tools || [];
  const toolsWithSchema = tools.filter((t: any) => t.inputSchema && t.inputSchema.properties);
  console.log(`  - method: tools/list -> ${tools.length} tools, ${toolsWithSchema.length} tools có inputSchema JSON Schema.`);

  // 7d. tools/call valid
  const callRes = await mockRpcCall({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'aevum_bridge_handshake',
      arguments: { clientName: 'Vercel-Serverless-Tester' },
    },
  });
  console.log('  - method: tools/call (aevum_bridge_handshake) -> isError =', !!callRes.data.result?.isError);

  // 7e. tools/call with invalid params (should return validation error without crashing)
  const invalidCallRes = await mockRpcCall({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'aevum_relay_task',
      arguments: { targetPersona: 'unknown_persona' }, // missing required instruction & taskType
    },
  });
  console.log('  - method: tools/call (invalid args) -> correctly flagged isError =', invalidCallRes.data.result?.isError);

  // 7f. resources/list
  const listResRes = await mockRpcCall({ jsonrpc: '2.0', id: 6, method: 'resources/list' });
  console.log('  - method: resources/list ->', listResRes.data.result?.resources?.length, 'resources.');

  // 7g. prompts/list
  const listPromptsRes = await mockRpcCall({ jsonrpc: '2.0', id: 7, method: 'prompts/list' });
  console.log('  - method: prompts/list ->', listPromptsRes.data.result?.prompts?.length, 'prompts.');

  console.log('\n✅ Hoàn tất bài test kiểm tra tích hợp & Authentication Key.');
}

runTests().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
