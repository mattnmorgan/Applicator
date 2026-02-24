import { FieldFilter } from "@/lib/database/crud/types/record-filter";

type ConditionBuilder = (
  filter: FieldFilter,
  params: any[],
  paramIdx: number,
) => [string, number];

export default ConditionBuilder;
