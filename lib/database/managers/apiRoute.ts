import CRUD from "@/lib/database/crud";
import ApiRoute from "@/lib/database/types/apiRoute";

export default class ApiRouteManager extends CRUD<ApiRoute> {
  tableName = "api-route";
  appId = "system";
}
