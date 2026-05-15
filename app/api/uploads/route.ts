import { handleUpload } from "@/app/api/_intelligence/shared";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    return await handleUpload(req);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Fallo procesando upload",
        details: err?.message || "Error no controlado",
      },
      { status: 500 },
    );
  }
}
