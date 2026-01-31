import CRUD from "@/lib/database/crud";
import ContextualAuthority from "@/lib/database/types/contextualAuthority";
import TableRecord from "@/lib/database/crud/types/record";
import bcrypt from "bcryptjs";

export default class ContextualAuthorityManager extends CRUD<ContextualAuthority> {
  tableName = "contextual-authority";
  appId = "system";

  /**
   * Generate a contextual authority key.
   *
   * @param appId App that owns the authority
   * @param recordId Domain-specific record grouping
   * @param type Type of contextual authority
   * @param suffix User id for user type, authority id for authority type, timestamp for password type
   * @returns Formatted key string
   */
  generateKey(
    appId: string,
    recordId: string,
    type: "user" | "password" | "authority",
    suffix: string
  ) {
    return `${appId}:${recordId}:${type}:${suffix}`;
  }

  /**
   * Create a password-protected contextual authority.
   * The password is automatically hashed before storage.
   *
   * @param params.app App that owns this authority
   * @param params.recordId Domain-specific record grouping (e.g. "share")
   * @param params.permission Permission string for this authority
   * @param params.password Plaintext password (will be hashed)
   * @param params.createdBy User ID of the creator
   * @param params.context Optional JSON string of app-specific context data
   * @returns The created contextual authority record
   */
  async createPasswordContextualAuthority(params: {
    app: string;
    recordId: string;
    permission: string;
    password: string;
    createdBy: string;
    context?: string;
  }): Promise<TableRecord<ContextualAuthority>> {
    const timestamp = Date.now();
    const key = this.generateKey(params.app, params.recordId, "password", String(timestamp));
    const hashedPassword = await bcrypt.hash(params.password, 10);

    const table = await this.getTable();
    return this.createRecord(table, {
      permission: params.permission,
      app: params.app,
      password: hashedPassword,
      createdAt: timestamp,
      createdBy: params.createdBy,
      ...(params.context !== undefined ? { context: params.context } : {}),
    }, { id: key });
  }

  /**
   * Create a user-scoped contextual authority.
   *
   * @param params.app App that owns this authority
   * @param params.recordId Domain-specific record grouping
   * @param params.permission Permission string for this authority
   * @param params.user User ID to scope the authority to
   * @param params.createdBy User ID of the creator
   * @param params.context Optional JSON string of app-specific context data
   * @returns The created contextual authority record
   */
  async createUserContextualAuthority(params: {
    app: string;
    recordId: string;
    permission: string;
    user: string;
    createdBy: string;
    context?: string;
  }): Promise<TableRecord<ContextualAuthority>> {
    const key = this.generateKey(params.app, params.recordId, "user", params.user);

    const table = await this.getTable();
    return this.createRecord(table, {
      permission: params.permission,
      app: params.app,
      user: params.user,
      createdAt: Date.now(),
      createdBy: params.createdBy,
      ...(params.context !== undefined ? { context: params.context } : {}),
    }, { id: key });
  }

  /**
   * Create an authority-scoped contextual authority.
   *
   * @param params.app App that owns this authority
   * @param params.recordId Domain-specific record grouping
   * @param params.permission Permission string for this authority
   * @param params.authority Authority ID to scope the authority to
   * @param params.createdBy User ID of the creator
   * @param params.context Optional JSON string of app-specific context data
   * @returns The created contextual authority record
   */
  async createAuthorityContextualAuthority(params: {
    app: string;
    recordId: string;
    permission: string;
    authority: string;
    createdBy: string;
    context?: string;
  }): Promise<TableRecord<ContextualAuthority>> {
    const key = this.generateKey(params.app, params.recordId, "authority", params.authority);

    const table = await this.getTable();
    return this.createRecord(table, {
      permission: params.permission,
      app: params.app,
      authority: params.authority,
      createdAt: Date.now(),
      createdBy: params.createdBy,
      ...(params.context !== undefined ? { context: params.context } : {}),
    }, { id: key });
  }

  /**
   * Delete a contextual authority by its record ID.
   *
   * @param contextId The contextual authority record ID
   * @returns True if deleted, false if not found
   */
  async deleteContextualAuthority(contextId: string): Promise<boolean> {
    return this.deleteRecord(contextId);
  }

  /**
   * Fetch all contextual authorities for a specific app and record ID grouping.
   * Matches records whose keys start with `{appId}:{recordId}:`.
   *
   * @param appId App that owns the authorities
   * @param recordId Domain-specific record grouping
   * @returns Array of matching contextual authority records
   */
  async getContextualAuthorities(
    appId: string,
    recordId: string,
  ): Promise<TableRecord<ContextualAuthority>[]> {
    const keyPrefix = `${appId}:${recordId}:`;
    const result = await this.readRecords();
    return result.records.filter((record) => record.id.startsWith(keyPrefix));
  }
}
