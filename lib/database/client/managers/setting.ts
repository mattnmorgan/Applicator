import CRUD from "@/lib/database/client/crud";
import Setting from "@/lib/database/types/setting";

export default class Manager extends CRUD<Setting> {
  tableId = "setting";
  appId = "system";
}
