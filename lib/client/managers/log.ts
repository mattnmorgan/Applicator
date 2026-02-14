import CRUD from "@/lib/client/database/crud/";
import Log from "@/lib/database/types/log";

export default class Manager extends CRUD<Log> {
  tableId = "log";
  appId = "system";
}
