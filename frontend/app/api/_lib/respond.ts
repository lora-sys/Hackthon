import { RegistryError } from "@wishlive/backend";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof RegistryError) {
    return json({ error: error.message }, error.statusCode);
  }

  if (error instanceof ZodError) {
    return json({ error: "Invalid request", issues: error.issues }, 400);
  }

  if (error instanceof Error) {
    return json({ error: error.message }, 500);
  }

  return json({ error: "Unknown error" }, 500);
}
