import CRUD from "@/lib/client/database/crud/";
import AppletSetting from "@/lib/database/types/applet-setting";

export default class Manager extends CRUD<AppletSetting> {
  tableId = "applet_settings";
  appId = "system";
}
