"use client";

import { useState, useEffect } from "react";
import Row from "../../utility/Row";
import Badge from "../../utility/Badge/Badge";
import styles from "./AuthorizationList.module.css";
import AuthorizationManager from "@/lib/client/managers/authorization";
import AppManager from "@/lib/client/managers/app";

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
  contextual?: boolean;
  target?: "user" | "app";
}

export default function AuthorizationList() {
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAuthorizations = async () => {
    try {
      const authorizationManager = new AuthorizationManager();
      const appManager = new AppManager();

      const [authData, appsData] = await Promise.all([
        authorizationManager.readRecords({}),
        appManager.readRecords({}),
      ]);

      // Create app label lookup
      const appLabels: Record<string, string> = {};
      for (const app of appsData.records) {
        appLabels[app.id] = app.data.label;
      }

      // Transform authorization records to expected format
      const authorizationsList = authData.records.map((record) => ({
        id: record.id,
        name: record.data.name,
        description: record.data.description,
        app: record.data.app,
        appLabel: appLabels[record.data.app] || record.data.app,
        contextual: record.data.contextual,
        target: record.data.target,
      }));

      setAuthorizations(authorizationsList);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
    }
  };

  useEffect(() => {
    fetchAuthorizations();
  }, []);

  const filteredAuthorizations = authorizations.filter(
    (authorization) =>
      authorization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      authorization.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search authorizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.authorizationList}>
        {filteredAuthorizations.map((authorization) => (
          <Row key={authorization.id}>
            <div className={styles.authorizationInfo}>
              <div className={styles.iconPlaceholder}>
                {authorization.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.contentColumn}>
                <div className={styles.authorizationName}>
                  {authorization.name}
                </div>
                <div className={styles.authorizationDescription}>
                  {authorization.description}
                </div>
              </div>
            </div>
            <div className={styles.appColumn}>
              {authorization.contextual && (
                <Badge variant="yellow">Contextual</Badge>
              )}
              {authorization.target === "app" && (
                <Badge variant="green">App</Badge>
              )}
              <Badge
                variant={authorization.app === "system" ? "purple" : "blue"}
              >
                {authorization.appLabel}
              </Badge>
            </div>
          </Row>
        ))}

        {filteredAuthorizations.length === 0 && (
          <div className={styles.emptyState}>No authorizations found</div>
        )}
      </div>
    </div>
  );
}
