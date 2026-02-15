import CRUD from "@/lib/client/database/crud/";
import Authority from "@/lib/database/types/authority";

export default class Manager extends CRUD<Authority> {
  tableId = "authorities";
  appId = "system";
}
