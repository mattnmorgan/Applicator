import AppList from "@/lib/components/administration/AppList/AppList";
import { redirectToFirstTimeSetup, redirectToLogin } from "@/lib/client/setup";

export default function AppsPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });
  return <AppList />;
}
