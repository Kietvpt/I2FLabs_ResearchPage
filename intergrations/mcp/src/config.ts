/**
 * Server Configuration
 */
import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  server: {
    name: 'i2flabs-aevum-mcp',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3300', 10),
  },
  auth: {
    masterApiKey: process.env.MCP_API_KEY,
  },
  aevum: {
    defaultLocalUrl: process.env.AEVUM_LOCAL_URL || 'http://127.0.0.1:3344',
    authToken: process.env.AEVUM_AUTH_TOKEN || '',
    workspacePath: process.env.AEVUM_WORKSPACE_PATH || 'D:/I2FLabs Vietnam/I2FLabs_ResearchPage',
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};
