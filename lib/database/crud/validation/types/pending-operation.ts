export default interface PendingOperation {
  type: "set" | "del";
  key: string;
  value?: string;
}
