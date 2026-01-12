import CRUD from "@/lib/database/client/crud";
import User from "@/lib/database/types/user";

export default class Manager extends CRUD<User> {
  tableId = "user";
  appId = "system";
}
