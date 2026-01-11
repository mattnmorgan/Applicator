export default interface Record<T = any> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
}
