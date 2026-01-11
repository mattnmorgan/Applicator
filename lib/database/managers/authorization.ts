import CRUD from "@/lib/database/crud";
import Authorization from "@/lib/database/types/authorization";

export default class AuthorizationManager extends CRUD<Authorization> {
  tableName = "authorization";
  appId = "system";
}
