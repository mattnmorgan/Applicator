import CRUD from "@/lib/database/crud";
import ContextualAuthority from "@/lib/database/types/contextualAuthority";

export default class ContextualAuthorityManager extends CRUD<ContextualAuthority> {
  tableName = "contextual-authority";
  appId = "system";

  /**
   *
   * @param appId
   * @param recordId
   * @param type
   * @param suffix User id for user type, authority id for authority type, timestamp for password type
   * @returns
   */
  generateKey(
    appId: string,
    recordId: string,
    type: "user" | "password" | "authority",
    suffix: string
  ) {
    return `${appId}:${recordId}:${type}:${suffix}`;
  }
}
