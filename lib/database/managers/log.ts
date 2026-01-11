import CRUD from "@/lib/database/crud";
import Log, { LogLevel } from "@/lib/database/types/log";
import SettingManager from "@/lib/database/managers/setting";
import { getCurrentUser } from "@/lib/database/managers/user";

export default class LogManager extends CRUD<Log> {
  appId = "system";
  tableName = "log";

  async createLog(
    variant: LogLevel,
    message: string,
    sender: string = "system"
  ) {
    const loggingEnabled =
      (await new SettingManager().readRecord("loggingEnabled"))?.data.value ===
      "true";

    if (loggingEnabled) {
      const now = Date.now();
      const record = await this.createRecord(
        await this.getTable(),
        {
          level: variant,
          message: message,
          userId: (await getCurrentUser()).user.id,
          timestamp: `${now}`,
          sender,
        },
        {
          id: `${now}`,
        }
      );
      return record;
    }
    return null;
  }
}
