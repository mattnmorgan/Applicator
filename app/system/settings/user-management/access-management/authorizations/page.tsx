import AuthorizationList from "@/lib/components/administration/AuthorizationList/AuthorizationList";
import { redirectToFirstTimeSetup, redirectToLogin } from "@/lib/client/setup";

export default function AuthorizationsPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });
  return <AuthorizationList />;
}
