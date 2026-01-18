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
      defaultValue?: string;
      relatedTo?: string;
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
    handler: string;
    description: string;
  }[];
  applets: {
    id: string;
    label: string;
    description: string;
    target: string;
    component: string;
  }[];
}
