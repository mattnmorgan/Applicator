export default interface Record<T = any> {
  id: string;
  data: T;
  created_at: number;
  updated_at: number;
}
