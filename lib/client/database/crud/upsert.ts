import TableRecord from "@/lib/database/crud/types/record";

export function upsertRecordWrapper<T = any>(appId: string, tableId: string) {
  return (id: string, data: T) => upsertRecord<T>(appId, tableId, id, data);
}

export async function upsertRecord<T = any>(
  appId: string,
  tableId: string,
  id: string,
  data: T
): Promise<TableRecord<T>> {
  const response = await fetch(
    `/api/${appId}/tables/${tableId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data }),
    }
  );

  if (!response.ok) {
    const json = await response.json();
    throw new Error(
      `Error upserting record: [${response.status}] ${json.error}`
    );
  }

  const result = await response.json();
  return result.record;
}
