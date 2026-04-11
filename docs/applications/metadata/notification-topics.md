# Notification Topics

Notification topics are declared in the `notificationTopics` array of `app.json`. Each entry registers a named channel that users can subscribe to individually — they can independently toggle **Internal** (bell icon) and **External** (ntfy push) delivery for each topic.

---

## Declaration

```json
{
  "notificationTopics": [
    {
      "id": "thread-reply",
      "name": "Thread Reply",
      "summary": "Sent when someone posts a reply to a thread you created",
      "ntfyTag": "speech_balloon"
    },
    {
      "id": "item-due",
      "name": "Item Due Soon",
      "summary": "Sent when a checklist item assigned to you is due today or tomorrow",
      "ntfyTag": "calendar"
    }
  ]
}
```

## Topic Properties

| Property  | Type     | Required | Description                                                                                      |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------------ |
| `id`      | `string` | Yes      | Unique topic identifier within the app. Combined with the app ID as `{appId}:{id}` in storage.  |
| `name`    | `string` | Yes      | Human-readable topic name shown in Notification Settings.                                        |
| `summary` | `string` | Yes      | One-sentence description of when this notification is sent.                                      |
| `ntfyTag` | `string` | No       | Emoji tag name for ntfy push notifications (e.g. `"speech_balloon"`, `"calendar"`). Overrides the default type-based tag. |

---

## Sending a Notification for a Topic

Pass `topicId` as `"{appId}:{topicId}"` when sending. The system checks the recipient's preferences and skips the appropriate channels if they have opted out.

### From an API route (plugin context)

```ts
await context.sendNotification({
  userId: recipientUserId,
  title: "New reply to your thread",
  message: `${posterName} replied to "${threadName}"`,
  type: "info",
  url: "/app/forums:main/thread/...",
  topicId: "forums:thread-reply",
});
```

### From an agent (IPC SDK)

```ts
await sdk("system.sendNotification", {
  userId: recipientUserId,
  title: "Task due today",
  message: `"${itemTitle}" is due today`,
  type: "warning",
  topicId: "tasklist:item-due",
});
```

### Via the CRUD tables route (direct record creation)

Pass `topicId` as a top-level field alongside `data`. It is **not** stored on the notification record — it is used only for preference checking:

```json
{
  "data": {
    "type": "info",
    "app": "my-app",
    "title": "Something happened",
    "message": "Details here",
    "user_id": "..."
  },
  "topicId": "my-app:my-topic"
}
```

---

## Lifecycle

- **Install**: Topics are written to the `notification_topics` system table.
- **Upgrade**: Topics are upserted (updated if changed, created if new, deleted if removed).
- **Uninstall**: All topics for the app are deleted. User preference records referencing those topics are inert but harmless.

---

## User Preferences

Users control their preferences per topic in **User Settings → Notifications**. Topics are grouped by app, and each row has independent toggles for:

- **Internal** — creates an in-app bell notification record.
- **External** — sends a push notification via ntfy (only visible when ntfy is configured).

Both channels default to **enabled** when the user has not yet set a preference.
