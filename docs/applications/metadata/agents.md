# Agent Metadata

Agents are declared in the `agents` array of `app.json`. Each entry defines a background process that runs either continuously or on a CRON schedule.

For implementation details — IPC protocol, SDK methods, agent script patterns — see [Agents](../agents.md).

---

## Declaration

```json
{
  "agents": [
    {
      "name": "cleanup",
      "label": "Daily Cleanup",
      "description": "Removes old records daily",
      "cron": "0 0 * * *"
    },
    {
      "name": "worker",
      "label": "Queue Worker",
      "description": "Processes background jobs continuously"
    }
  ]
}
```

## Agent Properties

| Property      | Type     | Required | Description                                                       |
| ------------- | -------- | -------- | ----------------------------------------------------------------- |
| `name`        | `string` | Yes      | Agent identifier. Must match the script filename (without `.js`). |
| `label`       | `string` | No       | Human-readable name shown in the admin UI                         |
| `description` | `string` | Yes      | What the agent does                                               |
| `cron`        | `string` | No       | CRON schedule expression. If omitted, the agent runs continuously. |

---

## Agent Types

### Continuous

Omit `cron` to create a continuously-running agent. The agent process starts and runs in a loop until stopped.

```json
{ "name": "worker", "description": "Continuous background worker" }
```

Use for: queue processing, real-time monitoring, long-running background tasks.

### CRON-Scheduled

Include a `cron` expression to run the agent on a schedule. The process is started at each scheduled time, runs once, and then exits.

```json
{ "name": "cleanup", "description": "Daily cleanup", "cron": "0 0 * * *" }
```

Use for: periodic cleanup, scheduled reports, daily/hourly tasks.

#### CRON Syntax

```
┌──────────── minute (0–59)
│ ┌──────────── hour (0–23)
│ │ ┌──────────── day of month (1–31)
│ │ │ ┌──────────── month (1–12)
│ │ │ │ ┌──────────── day of week (0–6, Sunday = 0)
│ │ │ │ │
* * * * *
```

| Expression      | Meaning                  |
| --------------- | ------------------------ |
| `* * * * *`     | Every minute             |
| `0 * * * *`     | Every hour               |
| `0 0 * * *`     | Daily at midnight        |
| `0 9 * * 1`     | Every Monday at 9 AM     |
| `*/5 * * * *`   | Every 5 minutes          |

---

## File Mapping

The `name` field must exactly match the agent's compiled filename:

```
src/agents/cleanup.ts  →  dist/agents/cleanup.js
src/agents/worker.ts   →  dist/agents/worker.js
```

The system loads agents from `{storage}/apps/{appId}/agents/{name}.js`.
