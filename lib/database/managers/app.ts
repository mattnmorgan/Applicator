import CRUD from "@/lib/database/crud";
import App from "@/lib/database/types/app";
import AuthorityManager from "@/lib/database/managers/authority";
import AuthorizationManager from "@/lib/database/managers/authorization";
import type Authority from "@/lib/database/types/authority";
import type Authorization from "@/lib/database/types/authorization";
import type TableRecord from "@/lib/database/crud/types/record";

export default class AppManager extends CRUD<App> {
  tableName = "apps";
  appId = "system";

  /**
   * Get the app-specific authority and its authorizations for an app
   */
  async getAppAuthority(appId: string): Promise<{
    authority: TableRecord<Authority> | null;
    authorizations: TableRecord<Authorization>[];
  }> {
    const authorityManager = new AuthorityManager();
    const authorizationManager = new AuthorizationManager();

    const authority = await authorityManager.readAppSpecificAuthority(appId);

    if (!authority) {
      return { authority: null, authorizations: [] };
    }

    const authorizations: TableRecord<Authorization>[] = [];
    for (const authId of authority?.data?.authorizations ?? []) {
      const auth = await authorizationManager.readRecord(authId);
      if (auth) {
        authorizations.push(auth);
      }
    }

    return { authority, authorizations };
  }
}
