import CRUD from "@/lib/client/database/crud/";
import App from "@/lib/database/types/app";

export default class Manager extends CRUD<App> {
  tableId = "app";
  appId = "system";
}
