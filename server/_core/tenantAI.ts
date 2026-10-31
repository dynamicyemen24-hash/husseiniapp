import { eq } from "drizzle-orm";
import { settings } from "../../drizzle/schema";
import { getDb } from "../db";
import { decryptExternalAIConfig } from "./externalAIConfig";
import { invokeLLM, type InvokeParams, type InvokeResult } from "./llm";

export async function getTenantAIProvider(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ externalAIConfig: settings.externalAIConfig })
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1);
  const config = decryptExternalAIConfig(row?.externalAIConfig);
  return config?.enabled && config.apiKey
    ? { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model }
    : null;
}

export async function invokeTenantLLM(
  tenantId: number,
  params: InvokeParams
): Promise<InvokeResult> {
  const provider = await getTenantAIProvider(tenantId);
  return invokeLLM({ ...params, ...(provider ? { provider } : {}) });
}
