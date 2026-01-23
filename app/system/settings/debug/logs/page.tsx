"use client";

import LoggingViewer from "@/lib/components/administration/LoggingViewer";
import { redirectToLogin, redirectToFirstTimeSetup } from "@/lib/client/setup";

export default function LogsPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LoggingViewer />
      </div>
    </div>
  );
}
