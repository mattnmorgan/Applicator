import CRUD from "@/lib/database/client/crud";
import Authority from "@/lib/database/types/authority";

export default class Manager extends CRUD<Authority> {
  tableId = "authority";
  appId = "system";
}
