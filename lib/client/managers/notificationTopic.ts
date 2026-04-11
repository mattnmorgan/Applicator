import CRUD from "@/lib/client/database/crud/";
import NotificationTopic from "@/lib/database/types/notificationTopic";

export default class Manager extends CRUD<NotificationTopic> {
  tableId = "notification_topics";
  appId = "system";
}
