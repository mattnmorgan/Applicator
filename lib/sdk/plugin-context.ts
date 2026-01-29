import { GenericCRUD as CRUD } from "@/lib/database/crud/";
import LogManager from "@/lib/database/managers/log";
import SettingManager from "@/lib/database/managers/setting";
import AuthorityManager from "@/lib/database/managers/authority";
import ContextUser from "@/lib/sdk/types/context-user";
import ContextApp from "@/lib/sdk/types/context-app";
import User from "@/lib/database/types/user";
import Authority from "@/lib/database/types/authority";
import App from "@/lib/database/types/app";
import { Filesystem } from "@/lib/system/filesystem";
import path from "path";

export default class Context {
  private appId: string;
  private userId: string | null;
  private logManager: LogManager | null;
  private contextUser: ContextUser | null;
  private contextApp: ContextApp | null;
  private _files: Filesystem;
  private _systemFiles?: Filesystem;

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
   * Create a new Context instance for an app.
   * Fetches storage settings, ensures the app data directory exists,
   * and checks for system:fs-access to provide systemFiles.
   */
  public static async create(
    appId: string,
    userId: string | null = null,
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

    return new Context(appId, userId, logManager, files, systemFiles);
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
   * @param userId User id to fetch info for, or null for current running user
   * @returns Information about a user
   */
  public async user(userId: string | null = null): Promise<ContextUser | null> {
    const targetUserId = userId || this.userId;
    let userInfo: ContextUser | undefined;

    if (!this.contextUser || userId) {
      const authorityManager = this.recordManager<Authority>(
        "system",
        "authority",
      );
      const userRecord = await this.recordManager<User>(
        "system",
        "user",
      ).readRecord(targetUserId);
      const systemAuthority = await authorityManager.readRecord(
        userRecord.data.authority,
      );
      const userSpecificAuthority = await authorityManager.readRecord(
        `user-specific:${targetUserId}`,
      );
      userInfo = {
        id: targetUserId,
        displayName: userRecord.data.displayName,
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
        "app",
      ).readRecord(targetAppId);
      const appAuthority = await this.recordManager<Authority>(
        "system",
        "authority",
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
