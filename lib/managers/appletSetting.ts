import CRUD from "@/lib/database/crud";
import AppletSetting from "@/lib/database/types/applet-setting";

export default class AppletSettingManager extends CRUD<AppletSetting> {
  appId = "system";
  tableName = "applet_settings";
}
