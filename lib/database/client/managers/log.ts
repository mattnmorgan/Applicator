import CRUD from "@/lib/database/client/crud";
import Log from "@/lib/database/types/log";

export default class Manager extends CRUD<Log> {
  tableId = "log";
  appId = "system";
}
