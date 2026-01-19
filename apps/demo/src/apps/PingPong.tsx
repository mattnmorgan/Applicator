import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api/demo";

interface Message {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  processedAt: string;
}

interface PendingMessage {
  id: string;
  text: string;
  timestamp: number;
  sentAt: string;
}

export default function PingPong() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"stopped" | "running" | "error" | "unknown">("unknown");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.responses || []);
        setPendingMessages(data.pendingMessages || []);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setConnected(false);
    }
  }, []);

  const checkAgentStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/demo/agents/ping-pong/status");
      if (response.ok) {
        const data = await response.json();
        setAgentStatus(data.status);
      }
    } catch (error) {
      setAgentStatus("unknown");
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMessages();
    checkAgentStatus();

    // Poll for updates every 1 second (simulating real-time)
    pollingRef.current = setInterval(() => {
      fetchMessages();
    }, 1000);

    // Check agent status every 5 seconds
    const statusInterval = setInterval(checkAgentStatus, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      clearInterval(statusInterval);
    };
  }, [fetchMessages, checkAgentStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    setLoading(true);
    const messageText = inputText.trim();
    setInputText("");

    try {
      const response = await fetch(`${API_BASE}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to send message");
      }

      // Immediately fetch to show pending
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  const styles = {
    container: {
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
      maxWidth: "800px",
      margin: "0 auto",
      height: "calc(100vh - 120px)",
      display: "flex",
      flexDirection: "column" as const,
    },
    header: {
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "20px",
      fontWeight: 600,
    },
    statusBar: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "13px",
    },
    statusIndicator: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    statusDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
    instructions: {
      background: "#1e293b",
      padding: "12px 16px",
      borderRadius: "8px",
      marginBottom: "16px",
      fontSize: "14px",
      color: "#94a3b8",
      border: "1px solid #334155",
    },
    chatArea: {
      flex: 1,
      background: "#0f172a",
      borderRadius: "8px",
      border: "1px solid #334155",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column" as const,
    },
    messageList: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "16px",
    },
    messageGroup: {
      marginBottom: "16px",
    },
    messageBubble: {
      maxWidth: "70%",
      padding: "10px 14px",
      borderRadius: "12px",
      marginBottom: "4px",
      fontSize: "14px",
      lineHeight: 1.4,
    },
    sentBubble: {
      background: "#3b82f6",
      color: "white",
      marginLeft: "auto",
      borderBottomRightRadius: "4px",
    },
    receivedBubble: {
      background: "#334155",
      color: "#e2e8f0",
      marginRight: "auto",
      borderBottomLeftRadius: "4px",
    },
    pendingBubble: {
      background: "#1e3a5f",
      color: "#94a3b8",
      marginLeft: "auto",
      borderBottomRightRadius: "4px",
      opacity: 0.7,
    },
    timestamp: {
      fontSize: "11px",
      color: "#64748b",
      marginTop: "2px",
    },
    inputArea: {
      padding: "16px",
      borderTop: "1px solid #334155",
      display: "flex",
      gap: "12px",
    },
    input: {
      flex: 1,
      padding: "12px 16px",
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#e2e8f0",
      fontSize: "14px",
      outline: "none",
    },
    sendButton: {
      padding: "12px 24px",
      background: "#3b82f6",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500,
      transition: "background 0.2s",
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "60px 20px",
      color: "#64748b",
    },
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏓 Ping Pong Agent</h1>
        <div style={styles.statusBar}>
          <div style={styles.statusIndicator}>
            <div
              style={{
                ...styles.statusDot,
                background: connected ? "#22c55e" : "#ef4444",
              }}
            />
            <span>{connected ? "Connected" : "Disconnected"}</span>
          </div>
          <div style={styles.statusIndicator}>
            <div
              style={{
                ...styles.statusDot,
                background:
                  agentStatus === "running"
                    ? "#22c55e"
                    : agentStatus === "error"
                    ? "#ef4444"
                    : "#fbbf24",
              }}
            />
            <span>Agent: {agentStatus}</span>
          </div>
        </div>
      </div>

      <div style={styles.instructions}>
        <strong>How it works:</strong> Type "ping" to receive "pong", or send any
        other message to have it echoed back. The ping-pong agent processes
        messages in the background.
        {agentStatus !== "running" && (
          <span style={{ color: "#fbbf24", marginLeft: "8px" }}>
            ⚠️ Start the agent from System Settings → Agents to see responses.
          </span>
        )}
      </div>

      <div style={styles.chatArea}>
        <div style={styles.messageList}>
          {messages.length === 0 && pendingMessages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏓</div>
              <div>No messages yet. Send "ping" to get started!</div>
            </div>
          ) : (
            <>
              {/* Show processed messages */}
              {[...messages].reverse().map((msg) => (
                <div key={msg.id} style={styles.messageGroup}>
                  <div style={{ ...styles.messageBubble, ...styles.sentBubble }}>
                    {msg.input}
                  </div>
                  <div style={{ ...styles.timestamp, textAlign: "right" }}>
                    Sent
                  </div>
                  <div style={{ ...styles.messageBubble, ...styles.receivedBubble }}>
                    {msg.output}
                  </div>
                  <div style={styles.timestamp}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))}

              {/* Show pending messages */}
              {pendingMessages.map((msg) => (
                <div key={msg.id} style={styles.messageGroup}>
                  <div style={{ ...styles.messageBubble, ...styles.pendingBubble }}>
                    {msg.text}
                    <span style={{ marginLeft: "8px", opacity: 0.7 }}>⏳</span>
                  </div>
                  <div style={{ ...styles.timestamp, textAlign: "right" }}>
                    Pending...
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={handleSend} style={styles.inputArea}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type 'ping' or any message..."
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            style={{
              ...styles.sendButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
