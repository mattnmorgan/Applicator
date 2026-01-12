import CRUD from "@/lib/database/client/crud";
import Authorization from "@/lib/database/types/authorization";

export default class Manager extends CRUD<Authorization> {
  tableId = "authorization";
  appId = "system";
}
