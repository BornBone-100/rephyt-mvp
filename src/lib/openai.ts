import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (cachedClient) return cachedClient;
  const serverEnv = getServerEnv();
  cachedClient = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
  return cachedClient;
}

export function getDefaultOpenAIModel() {
  const serverEnv = getServerEnv();
  return serverEnv.OPENAI_MODEL ?? "gpt-4.1-mini";
}

