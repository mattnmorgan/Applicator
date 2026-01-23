import AgentList from "@/lib/components/administration/AgentList/AgentList";
import { redirectToLogin, redirectToFirstTimeSetup } from "@/lib/client/setup";

export default function AgentsPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });

  return <AgentList />;
}
