import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let loaded = false;

export function loadContractEnv() {
  if (loaded) {
    return;
  }
  loaded = true;
  const envPath = [path.resolve(process.cwd(), "../.env"), path.resolve(process.cwd(), ".env")].find((candidate) =>
    existsSync(candidate)
  );
  if (!envPath) {
    return;
  }
  const entries = parseEnv(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(entries)) {
    process.env[key] = expandEnv(value, entries);
  }
}

function parseEnv(text: string) {
  const entries: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equals = line.indexOf("=");
    if (equals === -1) {
      continue;
    }
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim().replace(/^["']|["']$/g, "");
    entries[key] = value;
  }
  return entries;
}

function expandEnv(value: string, entries: Record<string, string>) {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key: string) => entries[key] ?? process.env[key] ?? "");
}
