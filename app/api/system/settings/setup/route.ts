import { NextResponse } from "next/server";
import { setupSystem } from "@/lib/system/installation/app-installer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, displayName, password } = body;

    // Use the setupSystem helper to handle the setup
    await setupSystem({
      username,
      email,
      displayName,
      password,
    });

    return NextResponse.json({
      success: true,
      message: "Administrator account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create administrator account",
      },
      {
        status:
          error instanceof Error && error.message.includes("already completed")
            ? 400
            : 500,
      }
    );
  }
}
