import CRUD from "@/lib/database/crud/";
import Notification from "@/lib/database/types/notification";

export default class Manager extends CRUD<Notification> {
  appId = "system";
  tableName = "notifications";
}
