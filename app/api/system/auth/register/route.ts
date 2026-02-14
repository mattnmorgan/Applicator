import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import UserManager from "@/lib/database/managers/user";
import SettingManager from "@/lib/database/managers/setting";

export async function POST(request: Request) {
  try {
    // Check if self-registration is enabled
    const settingManager = new SettingManager();
    const setting = await settingManager.readRecord("selfregistrationEnabled");
    if (!setting || setting.data.value !== "true") {
      return NextResponse.json(
        { error: "Self-registration is not enabled" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { username, email, displayName, password } = body;

    // Validate required fields
    if (!username || !email || !displayName || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Check for existing user with same username
    const userManager = new UserManager();
    const existingUsers = await userManager.readRecords({
      fields: { username },
    });

    if (existingUsers.records.length > 0) {
      return NextResponse.json(
        { error: "An account with this username already exists" },
        { status: 400 },
      );
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    await userManager.createRecord(await userManager.getTable(), {
      username,
      email,
      display_name: displayName,
      password_hash: passwordHash,
      authority_id: "system:user",
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
