import fs from "fs";
import path from "path";

export interface LogMessage {
  timestamp: number;
  level: "info" | "debug" | "warning" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

export default class Logger {
  private messages: LogMessage[] = [];
  private filename: string;
  private threshold: number;
  private append: boolean;

  constructor(options: {
    filename: string;
    threshold?: number;
    append?: boolean;
  }) {
    this.filename = options.filename;
    this.threshold = options.threshold ?? 100;
    this.append = options.append ?? true;
  }

  private createLogMessage(
    level: LogMessage["level"],
    message: string,
    metadata?: Record<string, unknown>,
  ): LogMessage {
    return {
      timestamp: Date.now(),
      level,
      message,
      metadata,
    };
  }

  private addMessage(logMessage: LogMessage): void {
    this.messages.push(logMessage);

    if (this.messages.length >= this.threshold) {
      this.flush();
    }
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.addMessage(this.createLogMessage("info", message, metadata));
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.addMessage(this.createLogMessage("debug", message, metadata));
  }

  public warning(message: string, metadata?: Record<string, unknown>): void {
    this.addMessage(this.createLogMessage("warning", message, metadata));
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    this.addMessage(this.createLogMessage("error", message, metadata));
  }

  public flush(): void {
    // Ensure directory exists
    const dir = path.dirname(this.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (this.messages.length === 0) {
      return;
    }

    const content =
      this.messages
        .map(
          (msg) =>
            `[${msg.timestamp}] [${msg.level.padEnd(5)}] ${msg.message} :: ${JSON.stringify(msg.metadata || {})}`,
        )
        .join("\n") + "\n";

    if (this.append) {
      fs.appendFileSync(this.filename, content);
    } else {
      fs.writeFileSync(this.filename, content);
    }

    this.messages = [];
  }

  get messageCount() {
    return this.messages.length;
  }

  get flushLimit() {
    return this.threshold;
  }

  set flushLimit(value: number) {
    this.threshold = value;
  }

  set file(fname: string) {
    this.filename = fname;
  }
}
