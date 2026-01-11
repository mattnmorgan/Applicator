import CRUD from "@/lib/database/crud";
import Widget from "@/lib/database/types/widget";

export default class WidgetManager extends CRUD<Widget> {
  tableName = "widget";
  appId = "system";
}
