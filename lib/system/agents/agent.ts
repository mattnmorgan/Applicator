import SettingManager from "@/lib/database/managers/setting";
import path from "path";
import Logger from "@/lib/system/logger";
import fs from "fs/promises";
import AgentManager from "@/lib/database/managers/agent";
import LogManager from "@/lib/database/managers/log";
import {
  formatNextExecution,
  getNextCronExecution,
  matchesCronSchedule,
} from "@/lib/system/cron";
import { ChildProcess, fork } from "child_process";
import AgentState from "@/lib/system/agents/types/state";
import AgentIPCRequest from "@/lib/system/agents/types/ipc-request";
import executeMethod from "@/lib/system/agents/sdk";

export default class Agent {
  private appId: string;
  private agentName: string;
  private storagePath: string | undefined;
  private _logger: Logger | null;
  private maxLogs: number;

  /**
   * Static map of all running agents, keyed by agent ID (appId:agentName)
   */
  private static runningAgents: Map<string, AgentState> = new Map();

  public constructor(
    appId: string,
    agentName: string,
    logger: Logger | null = null,
    maxLogs: number = 50,
  ) {
    this.appId = appId;
    this.agentName = agentName;
    this.storagePath = undefined;
    this._logger = logger;
    this.maxLogs = maxLogs;
  }

  /**
   * Check if an agent is running by ID
   */
  public static isAgentRunning(agentId: string): boolean {
    return Agent.runningAgents.has(agentId);
  }

  /**
   * Start the agent (schedule it for execution)
   */
  public async start(): Promise<boolean> {
    const agentManager = new AgentManager();
    const agent = await agentManager.readRecord(this.id);

    if (!agent) {
      throw new Error(`Agent not found: ${this.id}`);
    }

    if (this.isRunning) {
      return true;
    }

    await agentManager.updateRecord(await agentManager.getTable(), this.id, {
      status: "running",
      was_running: true,
      last_error: undefined,
    });

    const agentState: AgentState = {};

    if (agent.data.cron) {
      await new LogManager().info(
        this.appId,
        `Starting CRON agent '${agent.data.name}' with schedule: ${agent.data.cron}`,
      );

      agentState.cronInterval = setInterval(async () => {
        try {
          if (matchesCronSchedule(agent.data.cron!, new Date())) {
            const now = new Date();
            now.setSeconds(0, 0);
            if (agentState.lastExecution?.getTime() === now.getTime()) {
              return;
            }
            agentState.lastExecution = now;
            await new Agent(
              this.appId,
              this.agentName,
              new Logger({ filename: "" }),
            ).execute();
          }
        } catch (error: any) {
          await new LogManager().error(
            this.appId,
            `CRON agent '${agent.data.name}' execution failed: ${error.message}`,
          );
        }
      }, 60000);
    } else {
      await new LogManager().info(
        this.appId,
        `Starting continuous agent '${agent.data.name}' as child process`,
      );

      const { child, exitPromise } = await this.forkAgentProcess("continuous");

      agentState.process = child;

      // Handle process exit asynchronously
      exitPromise
        .then(async (code) => {
          // Only log if agent was still supposed to be running
          if (Agent.runningAgents.has(this.id)) {
            await new LogManager().info(
              this.appId,
              `Continuous agent '${agent.data.name}' process exited with code ${code}`,
            );
            Agent.runningAgents.delete(this.id);

            // Update status in database
            await agentManager.updateRecord(
              await agentManager.getTable(),
              this.id,
              {
                status: "stopped",
                was_running: false,
              },
            );
          }
        })
        .catch(async (error) => {
          await new LogManager().error(
            this.appId,
            `Continuous agent '${agent.data.name}' process error: ${error.message}`,
          );
        });
    }

    Agent.runningAgents.set(this.id, agentState);
    return true;
  }

  /**
   * Stop the agent (remove it from scheduling)
   */
  public async stop(): Promise<boolean> {
    const agentState = Agent.runningAgents.get(this.id);

    if (agentState) {
      if (agentState.cronInterval) {
        clearInterval(agentState.cronInterval);
      }

      if (agentState.process) {
        // Send shutdown message via IPC (works on Windows where SIGTERM doesn't)
        if (agentState.process.connected) {
          agentState.process.send({ type: "shutdown" });
        }

        // Give the process a moment to shut down gracefully, then force kill
        setTimeout(() => {
          try {
            if (agentState.process && !agentState.process.killed) {
              agentState.process.kill("SIGKILL");
            }
          } catch {
            // Process may already be gone
          }
        }, 3000);
      }

      Agent.runningAgents.delete(this.id);
    }

    const agentManager = new AgentManager();
    const agent = await agentManager.readRecord(this.id);

    if (agent) {
      await agentManager.updateRecord(await agentManager.getTable(), this.id, {
        status: "stopped",
        was_running: false,
        pid: undefined,
      });

      await new LogManager().info(
        this.appId,
        `Agent '${agent.data.name}' stopped`,
      );
    }

    return true;
  }

  /**
   * Stop all running agents
   */
  public static async stopAll(): Promise<void> {
    const agentIds = Array.from(Agent.runningAgents.keys());

    for (const agentId of agentIds) {
      try {
        const [appId, agentName] = agentId.split(":");
        await new Agent(appId, agentName).stop();
      } catch (error) {
        console.error(`Failed to stop agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Cleans up old logs
   *
   * @returns Number of deleted old logs
   */
  private async cleanupLogs(): Promise<number> {
    const logs = await this.listLogs();

    if (this.maxLogs <= 0 || logs.length <= this.maxLogs) {
      return 0;
    }

    let deleted = 0;

    for (const file of logs.slice(this.maxLogs)) {
      try {
        await fs.unlink(file.path);
        deleted++;
      } catch (error) {
        this._logger.error("Unable to delete log file: " + file.path);
      }
    }

    return deleted;
  }

  /**
   * @returns List of log files for the agent
   */
  private async listLogs(): Promise<
    { filename: string; path: string; timestamp: Date }[]
  > {
    const logDirectory = await this.getLogDirectory();

    if (!logDirectory) {
      return [];
    }

    try {
      const files = await fs.readdir(logDirectory);
      const logFiles = files
        .filter((f) => f.endsWith(".log"))
        .map((filename) => {
          const timestampStr = filename
            .replace(".log", "")
            .replace(/-/g, (m, i) =>
              i === 4 || i === 7
                ? "-"
                : i === 13 || i === 16
                  ? ":"
                  : i === 19
                    ? "."
                    : m,
            );
          let timestamp: Date;
          try {
            timestamp = new Date(timestampStr);
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date();
            }
          } catch {
            timestamp = new Date();
          }

          return {
            filename,
            path: path.join(logDirectory, filename),
            timestamp,
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return logFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * @returns The path to this agent's log directory
   */
  public async getLogDirectory(): Promise<string> {
    if (!this.storagePath) {
      this.storagePath = (
        await new SettingManager().readRecord("storage")
      )?.data.value;
    }

    if (!this.storagePath) {
      return null;
    }

    return path.join(
      this.storagePath,
      "apps",
      "system",
      "logs",
      this.appId,
      this.agentName,
    );
  }

  /**
   * @returns The path to this agent's source file
   */
  public async getScriptPath(): Promise<string | null> {
    if (!this.storagePath) {
      this.storagePath = (
        await new SettingManager().readRecord("storage")
      )?.data.value;
    }

    if (!this.storagePath) {
      return null;
    }

    return path.join(
      this.storagePath,
      "apps",
      this.appId,
      "agents",
      `${this.agentName}.js`,
    );
  }

  /**
   * @returns The current status of this agent
   */
  public async getStatus(): Promise<{
    status: "stopped" | "running" | "error";
    lastRun?: number;
    lastError?: string;
    nextRun?: string;
    nextExecution?: Date;
    nextRunFormatted?: string;
  } | null> {
    const record = await new AgentManager().readRecord(
      `${this.appId}:${this.agentName}`,
    );

    if (!record) {
      return null;
    }

    let nextRun: string | undefined;
    let nextExecution: Date | undefined;
    let nextRunFormatted: string | undefined;

    if (record.data.cron && record.data.status == "running") {
      nextExecution = getNextCronExecution(record.data.cron);

      if (nextExecution) {
        nextRun = nextExecution.toISOString();
        nextRunFormatted = formatNextExecution(nextExecution);
      }
    }

    return {
      status: record.data.status,
      lastRun: record.data.last_run,
      lastError: record.data.last_error,
      nextRun,
      nextRunFormatted,
      nextExecution,
    };
  }

  /**
   * Initialize the agent
   */
  private async initialize(): Promise<void> {
    if (!this._logger) {
      throw new Error("Cannot initialize agent without a logger");
    }

    if (this._logger.messageCount > 0) {
      throw new Error("Agent must have an empty logger");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this._logger.file = `${await this.getLogDirectory()}/${timestamp}.log`;
    this._logger.debug("Agent has begun execution");
  }

  /**
   * Finalizes agent execution
   * @param context Contextual information about the agent's finalization
   */
  private async finalize(context: {
    success: boolean;
    [key: string]: any;
  }): Promise<void> {
    this._logger.debug("Agent has finished execution", context);
    this._logger.flush();
    await this.cleanupLogs();
  }

  /**
   * Fork the agent script as a subprocess with IPC handling
   * @param mode The execution mode ("cron" or "continuous")
   * @returns The child process and a promise that resolves when the process exits
   */
  private async forkAgentProcess(
    mode: "cron" | "continuous",
  ): Promise<{ child: ChildProcess; exitPromise: Promise<number> }> {
    const scriptPath = await this.getScriptPath();

    if (!scriptPath) {
      throw new Error(`Could not determine script path for agent: ${this.id}`);
    }

    const child = fork(scriptPath, [], {
      env: {
        ...process.env,
        AGENT_APP_ID: this.appId,
        AGENT_NAME: this.agentName,
        AGENT_MODE: mode,
      },
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    // Capture stderr for debugging
    if (child.stderr) {
      child.stderr.on("data", (data: Buffer) => {
        const errorOutput = data.toString().trim();
        if (errorOutput) {
          new LogManager().error(
            this.appId,
            `Agent '${this.agentName}' stderr: ${errorOutput}`,
          );
        }
      });
    }

    child.on("message", async (message: AgentIPCRequest) => {
      if (message.id && message.method) {
        const { id, method, params } = message;

        try {
          const result = await executeMethod(
            this.appId,
            this.agentName,
            this.logger,
            method,
            params,
          );
          child.send({ id, result });
        } catch (error: any) {
          child.send({ id, error: error.message || String(error) });
        }
      }
    });

    // Create a promise that resolves when the process exits
    const exitPromise = new Promise<number>((resolve, reject) => {
      child.on("exit", (code) => {
        resolve(code ?? 1);
      });

      child.on("error", (error) => {
        reject(error);
      });
    });

    return { child, exitPromise };
  }

  /**
   * Executes the agent (for cron/one-shot execution)
   * Forks the agent script as a subprocess and waits for completion
   */
  public async execute(): Promise<void> {
    const executionStart = Date.now();
    let executionContext: { success: boolean; [key: string]: any } = {
      success: true,
      executionTime: -1,
    };

    await this.initialize();

    try {
      const { exitPromise } = await this.forkAgentProcess("cron");

      const exitCode = await exitPromise;
      if (exitCode !== 0) {
        throw new Error(`Agent process exited with code ${exitCode}`);
      }
    } catch (error: any) {
      executionContext.success = false;
      executionContext.error = error.message || String(error);
    } finally {
      executionContext.executionTime = Date.now() - executionStart;

      const manager = new AgentManager();
      await manager.updateRecord(
        await manager.getTable(),
        `${this.appId}:${this.agentName}`,
        {
          last_run: Date.now(),
          last_error: executionContext?.error,
        },
      );
    }

    await this.finalize({ ...executionContext });
  }

  /**
   * @returns Logger instance for storing agent logs
   */
  public get logger(): Logger {
    return this._logger;
  }

  /**
   * @returns The unique id for this agent
   */
  public get id(): string {
    return `${this.appId}:${this.agentName}`;
  }

  /**
   * @returns True if the agent is running or scheduled
   */
  public get isRunning(): boolean {
    return Agent.runningAgents.has(this.id);
  }
}
