import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/database/managers/user";
import UserManager from "@/lib/database/managers/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is a guest route (flagged by middleware)
  const headersList = await headers();
  const isGuestRoute = headersList.get("X-Guest-Route") === "true";

  if (!isGuestRoute) {
    // Check if first-time setup is needed
    const userManager = new UserManager();
    const users = await userManager.listRecords();
    if (users.length === 0) {
      redirect("/system/setup");
    }

    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      redirect("/system/login");
    }
  }

  return <>{children}</>;
}
