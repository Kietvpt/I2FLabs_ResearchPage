import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CONFIG } from './config.js';
import { allTools } from './tools/index.js';
import { allResources } from './resources/index.js';
import { allPrompts } from './prompts/index.js';
import { zodToJsonSchema } from './schemaHelper.js';

export function createAevumMcpServer(): Server {
  const server = new Server(
    {
      name: CONFIG.server.name,
      version: CONFIG.server.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 1. List Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.parameters),
      })),
    };
  });

  // 2. Call Tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = allTools.find((t) => t.name === name);

    if (!tool) {
      throw new Error(`Tool "${name}" không tồn tại trên I2FLabs Aevum MCP Server.`);
    }

    try {
      const parsedArgs = tool.parameters.parse(args || {});
      return await tool.handler(parsedArgs as any);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: `Lỗi thực thi tool [${name}]: ${errorMessage}`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // 3. List Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: allResources.map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      })),
    };
  });

  // 4. Read Resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const resource = allResources.find((r) => r.uri === uri);

    if (!resource) {
      throw new Error(`Resource "${uri}" không tồn tại.`);
    }

    return await resource.read();
  });

  // 5. List Prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: allPrompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      })),
    };
  });

  // 6. Get Prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const prompt = allPrompts.find((p) => p.name === name);

    if (!prompt) {
      throw new Error(`Prompt "${name}" không tồn tại.`);
    }

    return prompt.generate(args as any);
  });

  return server;
}
