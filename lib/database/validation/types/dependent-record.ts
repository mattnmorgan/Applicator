export default interface DependentRecord {
  appId: string;
  tableName: string;
  fieldName: string;
  recordId: string;
  recordData: Record<string, any>;
}
