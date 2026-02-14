import CRUD from "@/lib/database/crud";
import Agent from "@/lib/database/types/agent";

export default class Manager extends CRUD<Agent> {
  tableName = "agents";
  appId = "system";
}
