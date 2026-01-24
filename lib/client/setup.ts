"use client";

import { redirect } from "next/navigation";

export async function redirectToFirstTimeSetup(): Promise<undefined> {
  try {
    const response = await fetch("/api/system/settings");

    const data = response.ok ? await response.json() : null;
    if (!data?.setup?.complete) {
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
    const response = await fetch("/api/system/settings/user");

    if (!response.ok) {
      redirect("/system/login");
    }
  } catch (e) {
    console.error(e);
    redirect("/system/login");
  }
}

export async function redirectToLoggedInHome(): Promise<undefined> {
  try {
    const response = await fetch("/api/system/settings/user");

    if (response.ok) {
      redirect("/");
    }
  } catch (e) {
    console.error(e);
  }
}
