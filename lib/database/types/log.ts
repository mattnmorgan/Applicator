export type LogLevel = "debug" | "info" | "warning" | "error";

export default interface Log {
  timestamp: string;
  level: LogLevel;
  sender: string;
  user_id: string;
  message: string;
}
