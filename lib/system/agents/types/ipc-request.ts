export default interface AgentIPCRequest {
  id: string;
  method: string;
  params: Record<string, any>;
}
