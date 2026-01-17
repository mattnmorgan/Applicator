import CRUD from "@/lib/database/client/crud";
import Applet from "@/lib/database/types/applet";

export default class Manager extends CRUD<Applet> {
  tableId = "applet";
  appId = "system";
}
