import CRUD from "@/lib/database/crud";
import AgentExecution from "@/lib/database/types/agent-execution";

export default class AgentExecutionManager extends CRUD<AgentExecution> {
  tableName = "agent_executions";
  appId = "system";
}
