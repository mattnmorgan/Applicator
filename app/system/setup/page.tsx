"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import UserManager from "@/lib/database/client/managers/user";

export default function SetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect from first-time setup if a user is created already
  new UserManager().readRecords({ limit: 1 }).then((result) => {
    if (result.total) {
      router.replace("/");
    }
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/system/settings/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Redirect to login page
      router.push("/system/login");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
          width: "100%",
          maxWidth: "450px",
          border: "1px solid #334155",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            marginBottom: "10px",
            color: "#f1f5f9",
          }}
        >
          Welcome to Applicator
        </h1>
        <p
          style={{
            color: "#94a3b8",
            marginBottom: "30px",
          }}
        >
          Create your administrator account to get started
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="displayName"
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                color: "#e2e8f0",
              }}
            >
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #475569",
                borderRadius: "5px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                color: "#e2e8f0",
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #475569",
                borderRadius: "5px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                color: "#e2e8f0",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #475569",
                borderRadius: "5px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            />
          </div>

          <div style={{ marginBottom: "25px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "500",
                color: "#e2e8f0",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #475569",
                borderRadius: "5px",
                fontSize: "14px",
                boxSizing: "border-box",
                background: "#0f172a",
                color: "#f1f5f9",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px",
                marginBottom: "15px",
                background: "#7f1d1d",
                color: "#fecaca",
                borderRadius: "5px",
                fontSize: "14px",
                border: "1px solid #991b1b",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#475569" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Creating Account..." : "Create Administrator Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
