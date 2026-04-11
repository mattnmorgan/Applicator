import CRUD from "@/lib/database/crud/";
import NotificationTopic from "@/lib/database/types/notificationTopic";

export default class NotificationTopicManager extends CRUD<NotificationTopic> {
  appId = "system";
  tableName = "notification_topics";
}
