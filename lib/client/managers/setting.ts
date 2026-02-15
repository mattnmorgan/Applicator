import CRUD from "@/lib/client/database/crud/";
import Setting from "@/lib/database/types/setting";

export default class Manager extends CRUD<Setting> {
  tableId = "settings";
  appId = "system";
}
