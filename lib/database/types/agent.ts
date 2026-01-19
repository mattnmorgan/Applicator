export default interface Agent {
  app: string;
  name: string;
  description: string;
  cron?: string;
  status: "stopped" | "running" | "error";
  pid?: number;
  lastRun?: number;
  lastError?: string;
  wasRunning?: boolean;
}
