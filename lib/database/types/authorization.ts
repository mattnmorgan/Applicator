export default interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  /**
   * If true, this authorization is contextual and cannot be assigned to authorities
   */
  contextual?: boolean;
}
