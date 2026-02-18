import { sendInviteEmail } from "@/app/api/_utils/mailer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Testing email send with:", {
      ZOHO_HOST: process.env.ZOHO_HOST,
      ZOHO_PORT: process.env.ZOHO_PORT,
      ZOHO_USER: process.env.ZOHO_USER,
      ZOHO_APP_PASSWORD: process.env.ZOHO_APP_PASSWORD ? "***" : "NOT SET",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      MAIL_FROM: process.env.MAIL_FROM,
    });

    const result = await sendInviteEmail(email, "test-token-123", "developer", "full");

    return NextResponse.json({
      success: result,
      message: result ? "Email sent successfully" : "Failed to send email",
      config: {
        ZOHO_HOST: process.env.ZOHO_HOST,
        ZOHO_PORT: process.env.ZOHO_PORT,
        ZOHO_USER: process.env.ZOHO_USER,
        MAIL_FROM: process.env.MAIL_FROM,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
