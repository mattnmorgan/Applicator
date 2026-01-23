import AuthorityList from "@/lib/components/administration/AuthorityList";
import { redirectToFirstTimeSetup, redirectToLogin } from "@/lib/client/setup";

export default function AuthoritiesPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });
  return <AuthorityList />;
}
