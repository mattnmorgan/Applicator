import CRUD from "@/lib/database/crud";
import Applet from "@/lib/database/types/applet";

export default class AppletManager extends CRUD<Applet> {
  tableName = "applets";
  appId = "system";
}
