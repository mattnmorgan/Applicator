export type LogLevel = "debug" | "info" | "warning" | "error";

export default interface Log {
  timestamp: string;
  level: LogLevel;
  sender: string;
  userId: string;
  message: string;
}
