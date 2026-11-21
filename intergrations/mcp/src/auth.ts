/**
 * Authentication Middleware & Validator for I2FLabs Aevum MCP Server
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { CONFIG } from './config.js';

export interface AuthResult {
  authenticated: boolean;
  keyName?: string;
  error?: string;
}

/**
 * Validates the authentication key from headers or query parameters
 */
export async function validateMcpAuth(req: IncomingMessage): Promise<AuthResult> {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

  // 1. Extract token from Header or Query Param
  const authHeader = req.headers['authorization'];
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-api-key']) {
    token = String(req.headers['x-api-key']).trim();
  } else if (req.headers['x-mcp-key']) {
    token = String(req.headers['x-mcp-key']).trim();
  }

  // Fallback to query parameter for EventSource (SSE) support in browsers
  if (!token) {
    token =
      url.searchParams.get('apiKey') ||
      url.searchParams.get('key') ||
      url.searchParams.get('token') ||
      null;
  }

  if (!token) {
    return {
      authenticated: false,
      error: 'Thiếu Authentication Key. Hãy cung cấp qua header Authorization: Bearer <key> hoặc query param ?apiKey=<key>',
    };
  }

  // 2. Validate against Master Environment Key
  if (CONFIG.auth.masterApiKey && token === CONFIG.auth.masterApiKey) {
    return {
      authenticated: true,
      keyName: 'Master Admin Key (ENV)',
    };
  }

  // 3. Validate against live Supabase mcp_api_keys table
  try {
    const supabaseToken = CONFIG.supabase.serviceRoleKey || CONFIG.supabase.anonKey;
    if (CONFIG.supabase.url && supabaseToken && !CONFIG.supabase.url.includes('default.supabase.co')) {
      const dbRes = await fetch(
        `${CONFIG.supabase.url}/rest/v1/mcp_api_keys?key_value=eq.${encodeURIComponent(token)}&is_active=eq.true&select=name,role,is_active`,
        {
          headers: {
            apikey: supabaseToken,
            Authorization: `Bearer ${supabaseToken}`,
          },
        }
      );

      if (dbRes.ok) {
        const rows = (await dbRes.json()) as Array<{ name: string; role: string }>;
        if (rows.length > 0) {
          // Touch last_used_at in background
          void fetch(
            `${CONFIG.supabase.url}/rest/v1/mcp_api_keys?key_value=eq.${encodeURIComponent(token)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: supabaseToken,
                Authorization: `Bearer ${supabaseToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ last_used_at: new Date().toISOString() }),
            }
          ).catch(() => {});

          return {
            authenticated: true,
            keyName: rows[0].name,
          };
        }
      }
    }
  } catch {
    // If Supabase table is not yet migrated, fallback check already handled above
  }

  return {
    authenticated: false,
    error: 'Authentication Key không hợp lệ hoặc đã bị vô hiệu hóa.',
  };
}

/**
 * Express / Node HTTP Middleware helper to guard MCP endpoints
 */
export async function requireMcpAuth(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const result = await validateMcpAuth(req);

  if (!result.authenticated) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'WWW-Authenticate': 'Bearer realm="I2FLabs Aevum MCP Server"',
    });
    res.end(
      JSON.stringify(
        {
          error: 'Unauthorized',
          message: result.error || 'Authentication required to access MCP protocols.',
          hint: 'Truy cập https://your-server/?help để xem hướng dẫn cấu hình Authentication Key.',
        },
        null,
        2
      )
    );
    return false;
  }

  return true;
}
