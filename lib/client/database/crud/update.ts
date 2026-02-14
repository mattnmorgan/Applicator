import BulkResult from "@/lib/database/crud/types/bulk-result";
import TableRecord from "@/lib/database/crud/types/record";

export function updateRecordWrapper<T = any>(appId: string, tableId: string) {
  return (id: string, data: Partial<T>, errorOnFail: boolean = false) =>
    updateRecord<T>(appId, tableId, id, data, errorOnFail);
}

export function updateRecordsWrapper<T = any>(appId: string, tableId: string) {
  return (
    updates: { [id: string]: Partial<T> },
    errorOnFail: boolean = false,
  ) => updateRecords<T>(appId, tableId, updates, errorOnFail);
}

export async function updateRecord<T = any>(
  appId: string,
  tableId: string,
  id: string,
  data: Partial<T>,
  errorOnFail: boolean = false,
): Promise<TableRecord<T>> {
  const result = await updateRecords(appId, tableId, { [id]: data });

  if (result.failures.length) {
    if (errorOnFail) {
      throw new Error(`Unable to update record: ${result.failures[0].error}`);
    } else {
      console.error("Unable to update record: " + result.failures[0].error);
    }
  }

  return result.success?.[0];
}

export async function updateRecords<T = any>(
  appId: string,
  tableId: string,
  updates: { [id: string]: Partial<T> },
  errorOnFail: boolean = false,
): Promise<BulkResult<T>> {
  const response = await fetch(`/api/${appId}/tables/${tableId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates: Object.keys(updates).reduce((acc, id) => {
        acc.push({ id: id, data: updates[id] });
        return acc;
      }, []),
    }),
  });

  if (!response.ok) {
    const json = await response.json();

    if (errorOnFail) {
      throw new Error(
        `Error updating records: [${response.status}] ${json.error}`,
      );
    } else {
      console.error(
        `Error updating records: [${response.status}] ${json.error}`,
      );
    }
  }

  const json = await response.json();

  if (json.failures) {
    return { failures: json.failures, success: json.success };
  }
  return { failures: [], success: json.success };
}
