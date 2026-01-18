export function deleteRecordWrapper(appId: string, tableId: string) {
  return (id: string, errorOnFail: boolean = false) =>
    deleteRecord(appId, tableId, id, errorOnFail);
}

export function deleteRecordsWrapper(appId: string, tableId: string) {
  return (ids: string[], errorOnFail: boolean = false) =>
    deleteRecords(appId, tableId, ids, errorOnFail);
}

export async function deleteRecord(
  appId: string,
  tableId: string,
  id: string,
  errorOnFail: boolean = false
) {
  await _deleteRecords(appId, tableId, [id], false, errorOnFail);
}

export async function deleteRecords(
  appId: string,
  tableId: string,
  ids: string[],
  errorOnFail: boolean = false
) {
  await _deleteRecords(appId, tableId, ids, false, errorOnFail);
}

export async function deleteAll(
  appId: string,
  tableId: string,
  errorOnFail: boolean = false
) {
  await _deleteRecords(appId, tableId, [], true, errorOnFail);
}

async function _deleteRecords(
  appId: string,
  tableId: string,
  ids: string[],
  deleteAll: boolean = false,
  errorOnFail: boolean = false
) {
  const paramBits = [
    deleteAll ? "deleteAll=true" : "",
    ids.length == 1 ? `id=${ids[0]}` : "",
  ];
  const paramUrl = paramBits.filter((b) => b.length).join("&");
  const response = await fetch(
    `/api/${appId}/tables/${tableId}${
      paramUrl ? "?" + paramUrl : ""
    }`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ids.length > 1 ? ids : undefined,
      }),
    }
  );

  if (!response.ok && errorOnFail) {
    throw new Error(
      `Error deleting records: [${response.status}] ${
        (await response.json()).error
      }`
    );
  }
}
