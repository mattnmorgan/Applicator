import CRUD from "@/lib/client/database/crud/";
import Authorization from "@/lib/database/types/authorization";

export default class Manager extends CRUD<Authorization> {
  tableId = "authorizations";
  appId = "system";
}
