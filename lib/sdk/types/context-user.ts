import ContextAuthority from "@/lib/sdk/types/context-authority";

export default interface ContextUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  authorities: {
    system: ContextAuthority;
    userSpecific: ContextAuthority;
  };
}
