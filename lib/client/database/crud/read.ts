import ReadResult from "@/lib/database/crud/types/read-result";

export function readRecordWrapper<T = any>(appId: string, tableId: string) {
  return (params: { id?: string; fields?: { [field: string]: any } }) =>
    readRecord<T>(appId, tableId, params);
}

export function readRecordsWrapper<T = any>(appId: string, tableId: string) {
  return (params: {
    ids?: string[];
    fields?: { [field: string]: any };
    limit?: number;
    offset?: number;
    includeRelated?: string[];
  }) => readRecords<T>(appId, tableId, params);
}

export async function readRecord<T = any>(
  appId: string,
  tableId: string,
  params: { id?: string; fields?: { [field: string]: any }; includeRelated?: string[] }
) {
  const result = await readRecords<T>(appId, tableId, {
    ids: params.id ? [params.id] : undefined,
    fields: params.fields ?? undefined,
    limit: 1,
    offset: 0,
    includeRelated: params.includeRelated,
  });
  return result.records?.[0] || null;
}

export async function readRecords<T = any>(
  appId: string,
  tableId: string,
  params: {
    ids?: string[];
    fields?: { [field: string]: any };
    limit?: number;
    offset?: number;
    includeRelated?: string[];
  }
): Promise<ReadResult<T>> {
  const paramBits = [
    params.ids ? `ids=${params.ids.join(",")}` : "",
    params.fields ? `fields=${JSON.stringify(params.fields)}` : "",
    params.limit ? `limit=${params.limit}` : "",
    params.offset ? `offset=${params.offset}` : "",
    params.includeRelated ? `includeRelated=${params.includeRelated.join(",")}` : "",
  ];
  const paramUrl = paramBits.filter((b) => b.length).join("&");
  const response = await fetch(
    `/api/${appId}/tables/${tableId}${
      paramUrl.length ? "?" + paramUrl : ""
    }`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const json = await response.json();
    throw new Error(
      `Error reading records: [${response.status}] ${json.error}`
    );
  }

  return await response.json();
}
