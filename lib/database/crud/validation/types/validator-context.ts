import Field from "@/lib/database/types/field";

export default interface Context {
  value: any;
  record: Record<string, any>;
  field: Field;
}
