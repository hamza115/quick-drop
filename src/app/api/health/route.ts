import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db/mongodb";

export async function GET() {
  try {
    await pingDatabase();
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    // Do not return driver errors: they can contain connection details.
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
