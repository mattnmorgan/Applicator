import CRUD from "@/lib/client/database/crud/";
import Notification from "@/lib/database/types/notification";

export default class Manager extends CRUD<Notification> {
  tableId = "notification";
  appId = "system";
}
