export default interface Agent {
  app: string;
  name: string;
  description: string;
  cron?: string;
  status: "stopped" | "running" | "error";
  pid?: number;
  last_run?: number;
  last_error?: string;
  was_running?: boolean;
}
