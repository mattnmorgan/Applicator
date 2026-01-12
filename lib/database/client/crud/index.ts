import {
  createRecordWrapper,
  createRecordsWrapper,
} from "@/lib/database/client/crud/create";
import {
  updateRecordWrapper,
  updateRecordsWrapper,
} from "@/lib/database/client/crud/update";
import {
  deleteRecordWrapper,
  deleteRecordsWrapper,
  deleteAll,
} from "@/lib/database/client/crud/delete";
import {
  readRecordWrapper,
  readRecordsWrapper,
} from "@/lib/database/client/crud/read";
import { SystemSettings } from "@/lib/database/managers/setting";

export default abstract class CRUD<T = any> {
  tableId: string;
  appId: string;

  get createRecord() {
    return createRecordWrapper<T>(this.appId, this.tableId);
  }
  get createRecords() {
    return createRecordsWrapper<T>(this.appId, this.tableId);
  }
  get updateRecord() {
    return updateRecordWrapper<T>(this.appId, this.tableId);
  }
  get updateRecords() {
    return updateRecordsWrapper<T>(this.appId, this.tableId);
  }
  get deleteRecord() {
    return deleteRecordWrapper(this.appId, this.tableId);
  }
  get deleteRecords() {
    return deleteRecordsWrapper(this.appId, this.tableId);
  }
  async deleteAll(errorOnFail: boolean = false) {
    return deleteAll(this.appId, this.tableId, errorOnFail);
  }
  get readRecord() {
    return readRecordWrapper<T>(this.appId, this.tableId);
  }
  get readRecords() {
    return readRecordsWrapper<T>(this.appId, this.tableId);
  }
}

export async function uploadFile(file: File, dir: string, fname: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", dir);
  formData.append("name", fname);

  const response = await fetch("/api/system/apps/fs", {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `Failure uploading file: [${response.status}] ${response.statusText}`
    );
  }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await fetch("/api/system/settings");

  if (!response.ok) {
    throw new Error(
      `Unable to fetch system settings: [${response.status}] ${response.statusText}`
    );
  }

  return (await response.json()).settings;
}
