export type NotificationType = "warning" | "error" | "info" | "success";

export default interface Notification {
  type: NotificationType;
  app: string;
  icon?: string;
  title: string;
  message: string;
  url?: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
  userId: string;
}
