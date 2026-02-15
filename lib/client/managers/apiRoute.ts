import CRUD from "@/lib/client/database/crud/";
import ApiRoute from "@/lib/database/types/apiRoute";

export default class Manager extends CRUD<ApiRoute> {
  tableId = "api_routes";
  appId = "system";
}
