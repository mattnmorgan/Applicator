import CRUD from "@/lib/database/client/crud";
import App from "@/lib/database/types/app";

export default class Manager extends CRUD<App> {
  tableId = "app";
  appId = "system";
}
