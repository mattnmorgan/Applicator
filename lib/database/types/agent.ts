export default interface Agent {
  app: string;
  name: string;
  label?: string;
  description: string;
  cron?: string;
  manual?: boolean;
  status: "stopped" | "running" | "scheduled" | "error";
  pid?: number;
  last_run?: number;
  last_error?: string;
}
