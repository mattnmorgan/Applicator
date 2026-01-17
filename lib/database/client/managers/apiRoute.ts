import CRUD from "@/lib/database/client/crud";
import ApiRoute from "@/lib/database/types/apiRoute";

export default class Manager extends CRUD<ApiRoute> {
  tableId = "api-route";
  appId = "system";
}
