import { PoolClient } from "pg";
import CRUD from "@/lib/database/crud";
import Authority from "@/lib/database/types/authority";
import { Options as CreateOptions } from "@/lib/database/crud/create";
import { Options as UpdateOptions } from "@/lib/database/crud/update";
import { DeleteOptions } from "@/lib/database/crud/delete";

export default class AuthorityManager extends CRUD<Authority> {
  tableName = "authorities";
  appId = "system";

  async readUserAuthority(uid: string) {
    return this.readRecord(`user-specific:${uid}`);
  }
  async createUserAuthority(
    uid: string,
    data: Authority,
    options: CreateOptions = {}
  ) {
    return await this.createRecord(
      await this.getTable(),
      {
        ...data,
      },
      {
        ...options,
        id: `user-specific:${uid}`,
      }
    );
  }
  async updateUserAuthority(
    uid: string,
    data: Authority,
    options: UpdateOptions = {}
  ) {
    return await this.updateRecord(
      await this.getTable(),
      `user-specific:${uid}`,
      { ...data },
      {
        ...options,
      }
    );
  }

  async readAppSpecificAuthority(appId: string, client?: PoolClient) {
    return this.readRecord(`app-specific:${appId}`, client);
  }

  async createAppSpecificAuthority(
    appId: string,
    data: Authority,
    options: CreateOptions = {}
  ) {
    return await this.createRecord(
      await this.getTable(),
      { ...data },
      { ...options, id: `app-specific:${appId}` }
    );
  }

  async updateAppSpecificAuthority(
    appId: string,
    data: Authority,
    options: UpdateOptions = {}
  ) {
    return await this.updateRecord(
      await this.getTable(),
      `app-specific:${appId}`,
      { ...data },
      { ...options }
    );
  }

  async deleteAppSpecificAuthority(
    appId: string,
    options: DeleteOptions = {},
  ) {
    return await this.deleteRecord(`app-specific:${appId}`, options);
  }
}
