export default interface UIContext<T = any> {
  /**
   * App identifier being accessed
   */
  appId: string;
  /**
   * Relative path accessed
   */
  path: string[];
  /**
   * Navigate to a URL, integrating with the platform router.
   * Prefer this over window.history.pushState or next/navigation's useRouter.
   */
  navigate: (url: string) => void;
  guest?: {
    /**
     * Contextual authority record id
     */
    id: string;
    /**
     * Data stored by the contextual authority record
     */
    data: T;
    /**
     * Password to access contextual authority record
     */
    password: string;
  };
}
