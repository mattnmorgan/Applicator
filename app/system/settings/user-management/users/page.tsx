"use client";

import UserList from "@/lib/components/administration/UserList";
import { redirectToFirstTimeSetup, redirectToLogin } from "@/lib/client/setup";

export default function UsersPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });

  return (
    <div>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "16px",
          marginTop: 0,
          color: "#f1f5f9",
        }}
      >
        Users
      </h2>
      <UserList />
    </div>
  );
}
