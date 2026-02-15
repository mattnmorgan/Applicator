import CRUD from "@/lib/client/database/crud/";
import Applet from "@/lib/database/types/applet";

export default class Manager extends CRUD<Applet> {
  tableId = "applets";
  appId = "system";
}
