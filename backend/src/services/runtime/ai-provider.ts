import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function hasAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
}

export function aiModelName() {
  return process.env.OPENAI_MODEL ?? "fallback-simulated";
}

export function createWishLiveModel(): LanguageModel {
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseURL: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")
  });
  return provider.chat(aiModelName());
}
