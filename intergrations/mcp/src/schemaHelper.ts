/**
 * JSON Schema generation helper for Zod parameter objects
 * Standardizes tool inputSchema across MCP Stdio, SSE and Serverless JSON-RPC
 */
export function zodToJsonSchema(schema: any): {
  type: string;
  properties: Record<string, any>;
  required?: string[];
} {
  if (!schema) return { type: 'object', properties: {} };

  const shape =
    schema.shape ||
    (typeof schema._def?.shape === 'function' ? schema._def.shape() : schema._def?.shape) ||
    {};

  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, propSchema] of Object.entries<any>(shape)) {
    let current = propSchema;
    let isOptional = false;
    let description = '';

    while (current) {
      if (current.description) {
        description = current.description;
      } else if (current._def?.description) {
        description = current._def.description;
      }

      if (current._def?.typeName === 'ZodOptional') {
        isOptional = true;
        current = current._def.innerType;
      } else if (current._def?.typeName === 'ZodDefault') {
        isOptional = true;
        current = current._def.innerType;
      } else {
        break;
      }
    }

    if (!isOptional) {
      required.push(key);
    }

    const typeName = current?._def?.typeName;
    const propDef: Record<string, any> = { description };

    if (typeName === 'ZodNumber') {
      propDef.type = 'number';
    } else if (typeName === 'ZodBoolean') {
      propDef.type = 'boolean';
    } else if (typeName === 'ZodArray') {
      propDef.type = 'array';
    } else if (typeName === 'ZodEnum') {
      propDef.type = 'string';
      propDef.enum = current._def.values;
    } else if (typeName === 'ZodRecord') {
      propDef.type = 'object';
    } else {
      propDef.type = 'string';
    }

    properties[key] = propDef;
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
