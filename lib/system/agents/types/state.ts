import { ChildProcess } from "child_process";

export default interface AgentState {
  cronInterval?: NodeJS.Timeout;
  lastExecution?: Date;
  process?: ChildProcess;
}
