# Agents

Agents are background processes that run independently of HTTP requests. They can run continuously or on a CRON schedule.

> **Metadata reference** — for declaring agents in `app.json` (name, label, description, cron, file naming), see [metadata/agents.md](./metadata/agents.md).

---

## IPC Communication Protocol

Agents run as separate Node.js processes and communicate with the framework via IPC (Inter-Process Communication).

### Message Format

**Request** (agent → parent):
```typescript
{
  id: string;        // Unique request ID
  method: string;    // SDK method name
  params: object;    // Method parameters
}
```

**Response** (parent → agent):
```typescript
{
  id: string;        // Matching request ID
  result?: any;      // Success result
  error?: string;    // Error message
}
```

**Shutdown** (parent → agent):
```typescript
{
  type: "shutdown"   // Graceful shutdown signal
}
```

---

## Agent SDK Reference

### Available Methods

#### Logger

```typescript
"logger.info"   // params: { message: string }
"logger.warn"   // params: { message: string }
"logger.error"  // params: { message: string }
```

#### Records

```typescript
"records.create"  // params: { table: string, data: object }
"records.list"    // params: { table: string, limit?: number, offset?: number }
"records.get"     // params: { table: string, id: string }
"records.update"  // params: { table: string, id: string, data: object }
"records.delete"  // params: { table: string, id: string }
```

#### Files

All paths are scoped to your app's data directory.

```typescript
"files.read"    // params: { path: string } → Returns base64 string
"files.write"   // params: { path: string, content: string, encoding?: "base64" }
"files.delete"  // params: { path: string }
"files.exists"  // params: { path: string } → Returns boolean
"files.mkdir"   // params: { path: string }
"files.list"    // params: { path: string } → Returns string[]
"files.stat"    // params: { path: string } → Returns { size, modifiedAt, isDirectory }
```

#### System

```typescript
"system.getUser"            // params: { userId: string }
"system.getUsers"           // params: { includeInactive?: boolean }
"system.checkAuthorization" // params: { userId: string, authorization: string }
```

---

## Continuous Agent Example

```typescript
// src/agents/queue-processor.ts

(async () => {
  // Types
  interface IPCResponse {
    id: string;
    result?: unknown;
    error?: string;
  }

  // IPC infrastructure
  const pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  let isRunning = true;

  // Handle messages from parent
  process.on("message", (message: IPCResponse | { type: string }) => {
    // Handle shutdown command
    if ("type" in message && message.type === "shutdown") {
      isRunning = false;
      return;
    }

    // Handle IPC responses
    const response = message as IPCResponse;
    if (response.id && pendingRequests.has(response.id)) {
      const { resolve, reject } = pendingRequests.get(response.id)!;
      pendingRequests.delete(response.id);

      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response.result);
      }
    }
  });

  // IPC request helper
  function request(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      pendingRequests.set(id, { resolve, reject });
      process.send!({ id, method, params });
    });
  }

  // SDK helpers
  const logger = {
    info: (message: string) => request("logger.info", { message }),
    warn: (message: string) => request("logger.warn", { message }),
    error: (message: string) => request("logger.error", { message }),
  };

  const files = {
    exists: (path: string) => request("files.exists", { path }) as Promise<boolean>,
    read: async (path: string): Promise<string> => {
      const base64 = (await request("files.read", { path })) as string;
      return Buffer.from(base64, "base64").toString("utf-8");
    },
    write: (path: string, content: string) =>
      request("files.write", { path, content, encoding: "utf-8" }),
  };

  const records = {
    list: (table: string, options?: { limit?: number; offset?: number }) =>
      request("records.list", { table, ...options }),
    update: (table: string, id: string, data: object) =>
      request("records.update", { table, id, data }),
  };

  // Handle SIGTERM/SIGINT (Unix)
  process.on("SIGTERM", () => { isRunning = false; });
  process.on("SIGINT", () => { isRunning = false; });

  // Main processing function
  async function processQueue(): Promise<void> {
    // Check for queued items
    const queueExists = await files.exists("queue.json");
    if (!queueExists) return;

    const queueData = await files.read("queue.json");
    const queue = JSON.parse(queueData);

    if (queue.length === 0) return;

    await logger.info(`Processing ${queue.length} items`);

    for (const item of queue) {
      try {
        // Process item
        await processItem(item);
        await logger.info(`Processed item: ${item.id}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        await logger.error(`Failed to process ${item.id}: ${msg}`);
      }
    }

    // Clear queue
    await files.write("queue.json", "[]");
  }

  async function processItem(item: any): Promise<void> {
    // Your processing logic here
  }

  // Main loop
  await logger.info("[Queue Processor] Started");

  while (isRunning) {
    try {
      await processQueue();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await logger.error(`[Queue Processor] Error: ${msg}`);
    }

    // Wait before next cycle
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  await logger.info("[Queue Processor] Shutting down");
  process.exit(0);
})();
```

---

## CRON Agent Example

```typescript
// src/agents/daily-cleanup.ts

(async () => {
  interface IPCResponse {
    id: string;
    result?: unknown;
    error?: string;
  }

  const pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  process.on("message", (message: IPCResponse) => {
    if (message.id && pendingRequests.has(message.id)) {
      const { resolve, reject } = pendingRequests.get(message.id)!;
      pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.result);
      }
    }
  });

  function request(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      pendingRequests.set(id, { resolve, reject });
      process.send!({ id, method, params });
    });
  }

  const logger = {
    info: (message: string) => request("logger.info", { message }),
    error: (message: string) => request("logger.error", { message }),
  };

  const records = {
    list: (table: string, options?: { limit?: number }) =>
      request("records.list", { table, ...options }) as Promise<{ records: any[] }>,
    delete: (table: string, id: string) =>
      request("records.delete", { table, id }),
  };

  try {
    await logger.info("[Cleanup] Starting daily cleanup");

    // Find old records
    const result = await records.list("temp-data", { limit: 1000 });
    const oldRecords = result.records.filter((r) => {
      const age = Date.now() - new Date(r.data.createdAt).getTime();
      return age > 7 * 24 * 60 * 60 * 1000; // Older than 7 days
    });

    await logger.info(`[Cleanup] Found ${oldRecords.length} old records`);

    // Delete old records
    for (const record of oldRecords) {
      await records.delete("temp-data", record.id);
    }

    await logger.info("[Cleanup] Completed successfully");
    process.exit(0);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await logger.error(`[Cleanup] Failed: ${msg}`);
    process.exit(1);
  }
})();
```

---

## Environment Variables

Agents receive these environment variables:

| Variable | Description |
|----------|-------------|
| `AGENT_APP_ID` | Your app's ID |
| `AGENT_NAME` | Agent name |
| `AGENT_MODE` | `"cron"` or `"continuous"` |

```typescript
const appId = process.env.AGENT_APP_ID || "unknown";
const agentName = process.env.AGENT_NAME || "unknown";
const mode = process.env.AGENT_MODE; // "cron" or "continuous"
```

---

## Webpack Configuration

Add agents to your webpack config:

```javascript
// webpack.api.config.js
const agentsDir = path.resolve(__dirname, "src/agents");
if (fs.existsSync(agentsDir)) {
  const agentFiles = fs.readdirSync(agentsDir)
    .filter(file => file.endsWith(".ts"))
    .reduce((entries, file) => {
      const name = file.replace(".ts", "");
      entries[`agents/${name}`] = `./src/agents/${file}`;
      return entries;
    }, {});

  Object.assign(handlers, agentFiles);
}
```

---

## Managing Agents

### Starting/Stopping

Agents can be started and stopped through the admin UI or API:
- Navigate to your app in the admin panel
- Find the Agents section
- Use Start/Stop buttons

### Status Monitoring

Agent status is tracked:
- `scheduled` - CRON agent is active and waiting for its next scheduled execution
- `running` - Agent is actively executing its script, or a continuous agent is live
- `stopped` - Agent is not running
- `error` - Agent encountered an error

### Auto-Restart

Agents with `wasRunning: true` are automatically restarted when the server starts. If the agent script is missing (app uninstalled), the agent record is cleaned up automatically.

---

## Best Practices

### 1. Handle Shutdown Gracefully

```typescript
let isRunning = true;

process.on("message", (msg) => {
  if (msg.type === "shutdown") {
    isRunning = false;
  }
});

process.on("SIGTERM", () => { isRunning = false; });

while (isRunning) {
  await doWork();
  await sleep(interval);
}

await cleanup();
process.exit(0);
```

### 2. Log Important Events

```typescript
await logger.info("[Agent] Started processing");
await logger.info(`[Agent] Processed ${count} items`);
await logger.error(`[Agent] Failed: ${error.message}`);
await logger.info("[Agent] Shutting down");
```

### 3. Handle Errors in the Loop

```typescript
while (isRunning) {
  try {
    await processWork();
  } catch (error) {
    await logger.error(`Error: ${error.message}`);
    // Don't exit - continue trying
  }
  await sleep(5000);
}
```

### 4. Use Reasonable Intervals

```typescript
// Good: 5 second interval for queue processing
await new Promise(r => setTimeout(r, 5000));

// Bad: Tight loop with no delay
while (isRunning) {
  await checkQueue(); // Will overwhelm the system
}
```

### 5. CRON Agents Should Exit

CRON agents run once per schedule. Always exit when done:

```typescript
try {
  await doScheduledWork();
  process.exit(0);
} catch (error) {
  await logger.error(`Failed: ${error.message}`);
  process.exit(1);
}
```
