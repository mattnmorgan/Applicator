import BulkResult from "@/lib/database/crud/types/bulk-result";
import TableRecord from "@/lib/database/crud/types/record";

export function createRecordWrapper<T = any>(appId: string, tableId: string) {
  return (
    record: Partial<T>,
    id: string | undefined = undefined,
    errorOnFail: boolean = false
  ) => createRecord<T>(appId, tableId, record, id, errorOnFail);
}

export function createRecordsWrapper<T = any>(appId: string, tableId: string) {
  return (records: Partial<T>[], errorOnFail: boolean = false) =>
    createRecords<T>(appId, tableId, records, errorOnFail);
}

export async function createRecord<T = any>(
  appId: string,
  tableId: string,
  record: Partial<T>,
  id: string | undefined = undefined,
  errorOnFail: boolean = false
): Promise<TableRecord<T>> {
  const response = await fetch(`/api/system/apps/${appId}/tables/${tableId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: id,
      data: record,
    }),
  });

  if (!response.ok && errorOnFail) {
    const json = await response.json();
    throw new Error(
      `Error creating records: [${response.status}] ${json.error}`
    );
  }

  return (await response.json()).record;
}

export async function createRecords<T = any>(
  appId: string,
  tableId: string,
  records: Partial<T>[],
  errorOnFail: boolean = false
): Promise<BulkResult<T>> {
  const response = await fetch(`/api/system/apps/${appId}/tables/${tableId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      records: records.map((r) => ({ data: r })),
    }),
  });

  if (!response.ok && errorOnFail) {
    const json = await response.json();
    throw new Error(
      `Error creating records: [${response.status}] ${json.error}`
    );
  }

  const json = await response.json();

  if (json.failures) {
    return { failures: json.failures, success: json.created };
  }
  return { success: json.records, failures: [] };
}
