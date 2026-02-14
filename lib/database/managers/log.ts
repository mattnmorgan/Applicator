import CRUD from "@/lib/database/crud";
import Log, { LogLevel } from "@/lib/database/types/log";
import SettingManager from "@/lib/database/managers/setting";
import { getCurrentUser } from "@/lib/database/managers/user";

export default class LogManager extends CRUD<Log> {
  appId = "system";
  tableName = "logs";

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

      // Try to get current user, but handle cases where we're outside a request context
      // (e.g., agent system initialization, background tasks)
      let userId = "system";
      try {
        const currentUser = await getCurrentUser();
        if (currentUser?.user.id) {
          userId = currentUser.user.id;
        }
      } catch {
        // Outside request context (e.g., agent system), use "system" as userId
      }

      const record = await this.createRecord(
        await this.getTable(),
        {
          level: variant,
          message: message,
          user_id: userId,
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

  /**
   * Create an info log entry
   * @param sender The sender of the log
   * @param message The log message
   */
  async info(sender: string, message: string) {
    return await this.createLog("info", message, sender);
  }

  /**
   * Create a warning log entry
   * @param sender The sender of the log
   * @param message The log message
   */
  async warn(sender: string, message: string) {
    return await this.createLog("warning", message, sender);
  }

  /**
   * Create an error log entry
   * @param sender The sender of the log
   * @param message The log message
   */
  async error(sender: string, message: string) {
    return await this.createLog("error", message, sender);
  }

  /**
   * Create a debug log entry
   * @param sender The sender of the log
   * @param message The log message
   */
  async debug(sender: string, message: string) {
    return await this.createLog("debug", message, sender);
  }
}
