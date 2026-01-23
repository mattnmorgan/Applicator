"use client";

import { getCurrentUser } from "@/lib/database/client/managers/user";
import { redirect } from "next/navigation";

export async function redirectToFirstTimeSetup(): Promise<undefined> {
  try {
    const response = await fetch("/api/system/settings");

    if (!response.ok || !(await response.json())?.setup?.complete === false) {
      redirect("/system/setup");
    }
  } catch (error) {
    console.error(error);
    redirect("/system/setup");
  }
}

export async function redirectToHome(): Promise<undefined> {
  try {
    const response = await fetch("/api/system/settings");

    if (response.ok && (await response.json())?.setup?.complete === true) {
      redirect("/");
    }
  } catch (error) {
    console.error(error);
  }
}

export async function redirectToLogin(): Promise<undefined> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/system/login");
    }
  } catch (e) {
    console.error(e);
  }
}

export async function redirectToLoggedInHome(): Promise<undefined> {
  try {
    const user = await getCurrentUser();

    if (user) {
      redirect("/");
    }
  } catch (e) {
    console.error(e);
  }
}
