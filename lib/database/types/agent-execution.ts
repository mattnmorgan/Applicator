export default interface AgentExecution {
  app: string;
  agent: string; // "{appId}:{agentName}"
  timestamp: number; // ms epoch — when execution started
  status: "success" | "failed" | "unknown";
  error: string | null;
  log_file: string | null; // filename only, e.g. "2026-03-17T10-00-07-653Z.log"
}
