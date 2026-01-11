import Field from "@/lib/database/types/field";

export default interface Context {
  record: Record<string, any>;
  field: Field;
}
