export default interface AppMetadata {
  id: string;
  name: string;
  version: {
    major: number;
    minor: number;
    dev: number;
  };
  author: string;
  contactEmail: string;
  description: string;
  dependencies?: {
    [appId: string]: {
      major: number;
      minor: number;
      dev: number;
    };
  };
  tables?: {
    name: string;
    description: string;
    fields: {
      name: string;
      description: string;
      type: string;
      required?: boolean;
      defaultValue?: any;
      relatedTo?: string;
      options?: any;
    }[];
  }[];
  authorizations?: {
    id: string;
    name: string;
    description: string;
    contextual?: boolean;
    target?: "user" | "app";
  }[];
  authorities?: {
    id: string;
    name: string;
    /**
     * List of authorizations formatted as `<app-id>:<authorization-id>` associated to this authority
     */
    authorizations?: string[];
  }[];
  apiRoutes?: {
    path: string;
    method: string;
    description: string;
  }[];
  applets: {
    id: string;
    label: string;
    description: string;
    target: string;
    component: string;
    settings?: {
      name: string;
      label: string;
      type: "string" | "number" | "boolean" | "picklist" | "multipicklist";
      default?: any;
      options?: Record<string, string>;
    }[];
  }[];
  agents?: {
    name: string;
    description: string;
    cron?: string;
  }[];
  /**
   * List of existing authorization IDs (e.g. "system:fs-access") the app requires to function.
   * These are resolved and presented to the admin for confirmation before installation.
   */
  requiredPermissions?: string[];
}
