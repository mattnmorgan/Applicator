import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/managers/user";
import UserManager from "@/lib/database/managers/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return <>{children}</>;
}
