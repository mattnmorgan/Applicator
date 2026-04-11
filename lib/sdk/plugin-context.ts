import { GenericCRUD as CRUD } from "@/lib/database/crud/";
import LogManager from "@/lib/managers/log";
import SettingManager from "@/lib/managers/setting";
import AuthorityManager from "@/lib/managers/authority";
import ContextualAuthorityManager from "@/lib/managers/contextualAuthority";
import ContextUser from "@/lib/sdk/types/context-user";
import ContextApp from "@/lib/sdk/types/context-app";
import User from "@/lib/database/types/user";
import Authority from "@/lib/database/types/authority";
import App from "@/lib/database/types/app";
import { Filesystem } from "@/lib/system/filesystem";
import { withTransaction as dbWithTransaction } from "@/lib/database/connections/postgresql";
import {
  sendNotification as _sendNotification,
  SendNotificationOptions,
} from "@/lib/system/notifications";
import path from "path";

export default class Context {
  private appId: string;
  private userId: string | null;
  private logManager: LogManager | null;
  private contextUser: ContextUser | null;
  private contextApp: ContextApp | null;
  private _files: Filesystem;
  private _systemFiles?: Filesystem;
  private _context: { id: string; data: any; password?: string } | null = null;
  private _contextualAuthorityManager: ContextualAuthorityManager | null = null;
  private _storagePath: string = "";

  private constructor(
    appId: string,
    userId: string | null,
    logManager: LogManager | null,
    files: Filesystem,
    systemFiles?: Filesystem,
  ) {
    this.appId = appId;
    this.userId = userId;
    this.logManager = logManager;
    this.contextUser = null;
    this.contextApp = null;
    this._files = files;
    this._systemFiles = systemFiles;
  }

  /**
   * @returns The system storage root path
   */
  public get storagePath(): string {
    return this._storagePath;
  }

  /**
   * Guest context information. Throws error if not in a guest user context.
   *
   * @returns Guest context information
   */
  public get contextGuest() {
    if (this.isGuest) {
      return {
        ...this._context,
        data: JSON.parse(JSON.stringify(this._context.data)),
      };
    }

    throw new Error("Cannot access guest context info for non-guest context");
  }

  /**
   * @returns True if this context is for a guest (unauthenticated) user.
   */
  public get isGuest(): boolean {
    return this._context !== null && this.userId === null;
  }

  /**
   * @returns Filesystem scoped to the app's data directory
   */
  public get appFileManager(): Filesystem {
    return this._files;
  }

  /**
   * Throws if the app does not have system:fs-access permission.
   * @returns Filesystem scoped to the system files directory.
   */
  public get systemFileManager(): Filesystem {
    if (!this._systemFiles) {
      throw new Error(
        "System filesystem access not available: app does not have system:fs-access permission",
      );
    }
    return this._systemFiles;
  }

  /**
   * @returns Memoized contextual authority manager instance
   */
  public get contextualAuthorityManager(): ContextualAuthorityManager {
    if (!this._contextualAuthorityManager) {
      this._contextualAuthorityManager = new ContextualAuthorityManager();
    }
    return this._contextualAuthorityManager;
  }

  /**
   * Create a new context instance.
   *
   * @param appId The app identifier to contextualize for
   * @param userId The user identifier to contextualize for (for authenticated sessions)
   * @param context Guest context information (for unauthenticated contexts)
   * @returns Context instance
   */
  public static async create(
    appId: string,
    userId: string | null = null,
    context?: { id: string; data: any; password?: string },
  ): Promise<Context> {
    const settingManager = new SettingManager();
    const storageRecord = await settingManager.readRecord("storage");
    const storagePath = storageRecord?.data.value;

    if (!storagePath) {
      throw new Error("System storage not configured");
    }

    const logManager = new LogManager();

    // Create app-scoped filesystem rooted at <storage>/apps/<appId>/data/
    const appStoragePath = path.join(storagePath, "apps", appId, "data");
    const files = new Filesystem(appStoragePath);
    await files.ensureRoot();

    // Create system filesystem if app has system:fs-access permission
    let systemFiles: Filesystem | undefined;
    const authorityManager = new AuthorityManager();
    const appAuthority = await authorityManager.readAppSpecificAuthority(appId);

    if (
      appAuthority &&
      appAuthority.data.authorizations.includes("system:fs-access")
    ) {
      const systemFilesPath = path.join(storagePath, "files");
      systemFiles = new Filesystem(systemFilesPath);
      await systemFiles.ensureRoot();
    }

    const instance = new Context(appId, userId, logManager, files, systemFiles);
    instance._storagePath = storagePath;
    if (context) {
      instance._context = context;
    }
    return instance;
  }

  /**
   * Create a record management instance for a specific type of record
   * @param appId App to fetch table for
   * @param tableId Table in the app to fetch
   * @returns CRUD manager for records
   */
  public recordManager<T>(appId: string, tableId: string): CRUD<T> {
    return new CRUD(appId, tableId);
  }

  /**
   * Run multiple record operations within a single database transaction.
   * If any operation throws, all changes are rolled back automatically.
   *
   * Pass the client through to CRUD operation options to enlist them in the transaction:
   *   await items.createRecord(table, data, { client })
   *   await items.updateRecord(table, id, data, { client })
   *   await items.deleteRecord(id, { client })
   *
   * @param fn Async callback that receives a transaction client
   * @returns The return value of fn
   */
  public withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    return dbWithTransaction(fn);
  }

  /**
   * Logger instance for posting logs to the system
   */
  public get logger() {
    return {
      info: async (msg: string) => this.logManager.info(this.appId, msg),
      warn: async (msg: string) => this.logManager.warn(this.appId, msg),
      debug: async (msg: string) => this.logManager.debug(this.appId, msg),
      error: async (msg: string) => this.logManager.error(this.appId, msg),
    };
  }

  /**
   * Send a notification to a user, respecting their per-topic preferences.
   *
   * @param options Notification options. `topicId` should be in the form
   *   `{appId}:{topicId}` (e.g. `"forums:thread-reply"`). When omitted the
   *   notification is always delivered on both channels.
   */
  public async sendNotification(
    options: Omit<SendNotificationOptions, "app"> & { app?: string },
  ): Promise<void> {
    await _sendNotification({ app: this.appId, ...options });
  }

  /**
   * @param userId User id to fetch info for, or null for current running user
   * @returns Information about a user
   */
  public async user(userId: string | null = null): Promise<ContextUser | null> {
    if (this.isGuest && !userId) {
      return null;
    }

    const targetUserId = userId || this.userId;
    let userInfo: ContextUser | undefined;

    if (!this.contextUser || userId) {
      const authorityManager = this.recordManager<Authority>(
        "system",
        "authorities",
      );
      const userRecord = await this.recordManager<User>(
        "system",
        "users",
      ).readRecord(targetUserId);
      const systemAuthority = await authorityManager.readRecord(
        userRecord.data.authority_id,
      );
      const userSpecificAuthority = await authorityManager.readRecord(
        `user-specific:${targetUserId}`,
      );
      userInfo = {
        id: targetUserId,
        display_name: userRecord.data.display_name,
        username: userRecord.data.username,
        email: userRecord.data.email,
        authorities: {
          system: {
            name: systemAuthority.data.name,
            authorizations: systemAuthority.data.authorizations,
          },
          userSpecific: {
            name: userSpecificAuthority?.data?.name || "Undefined",
            authorizations: userSpecificAuthority?.data?.authorizations || [],
          },
        },
      };
    }

    if (!userId && userInfo) {
      this.contextUser = userInfo;
    }

    return userId ? userInfo : this.contextUser;
  }

  /**
   * Fetch app information from the database
   *
   * @param appId App identifier to fetch information for, or null for this app's info
   * @returns App information requested
   */
  public async app(appId: string | null = null): Promise<ContextApp | null> {
    const targetAppId = appId || this.appId;
    let appInfo: ContextApp | undefined;

    if (!this.contextApp || appId) {
      const appRecord = await this.recordManager<App>(
        "system",
        "apps",
      ).readRecord(targetAppId);
      const appAuthority = await this.recordManager<Authority>(
        "system",
        "authorities",
      ).readRecord(`app-specific:${targetAppId}`);
      appInfo = {
        name: appRecord.data.label,
        version: appRecord.data.version,
        authority: {
          name: appAuthority.data.name,
          authorizations: appAuthority.data.authorizations,
        },
      };
    }

    if (!appId && appInfo) {
      this.contextApp = appInfo;
    }

    return appId ? appInfo : this.contextApp;
  }

  /**
   * @param auths Authorizations to check for
   * @returns Object mapping authorization names to whether the user has them or not
   */
  private async generateUserAuthMap(
    auths: string[],
  ): Promise<{ [auth: string]: boolean }> {
    const user = await this.user();

    return auths.reduce((acc, auth) => {
      acc[auth] =
        user.authorities.system.authorizations.includes(auth) ||
        user.authorities.userSpecific.authorizations.includes(auth);
      return acc;
    }, {});
  }

  public async isUserAuthorizedFor(auth: string): Promise<boolean> {
    return this.isUserAuthorized([auth], "some");
  }

  public async isUserAuthorized(
    auths: string[],
    test: "some" | "all",
  ): Promise<boolean> {
    const map = await this.generateUserAuthMap(auths);

    return test == "some"
      ? Object.keys(map).some((auth) => map[auth])
      : Object.keys(map).every((auth) => map[auth]);
  }

  /**
   * @param auths Authorizations to check
   * @param appId App id to check, or null for this app
   * @returns Map of auth names to whether the app has the auth or not
   */
  private async generateAppAuthMap(
    auths: string[],
    appId: string | null = null,
  ): Promise<{ [auth: string]: boolean }> {
    const app = await this.app(appId);

    return auths.reduce((acc, auth) => {
      acc[auth] = app.authority.authorizations.includes(auth);
      return acc;
    }, {});
  }

  public async isAppAuthorizedFor(
    auth: string,
    appId: string | null = null,
  ): Promise<boolean> {
    return await this.isAppAuthorized([auth], appId);
  }

  public async isAppAuthorized(
    auths: string[],
    appId: string | null = null,
    test: "some" | "all" = "some",
  ): Promise<boolean> {
    const app = await this.generateAppAuthMap(auths, appId);

    return test == "some"
      ? Object.keys(app).some((auth) => app[auth])
      : Object.keys(app).every((auth) => app[auth]);
  }
}
