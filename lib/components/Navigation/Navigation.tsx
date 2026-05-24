"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ButtonMenu from "../utility/ButtonMenu";
import ProfileIndicator from "../utility/ProfileIndicator";
import NotificationBell from "../NotificationBell";
import AssumeIdentityModal from "../administration/AssumeIdentityModal/AssumeIdentityModal";
import AppLauncherModal from "./AppLauncherModal";
import Icon from "../utility/Icon";
import styles from "./Navigation.module.css";

export interface LauncherItem {
  label: string;
  href: string;
  appletId?: string;
  appIconUrl?: string;
  appLabel?: string;
  description?: string;
}

export interface LauncherData {
  apps: LauncherItem[];
  userSettings: LauncherItem[];
  systemSettings?: LauncherItem[];
  devMenu?: LauncherItem[];
}

interface NavigationProps {
  displayName: string;
  profilePicture?: string;
  isAdmin?: boolean;
  brandName?: string;
  brandIcon?: string;
  authorizations?: string[];
  isAssumedIdentity?: boolean;
  launcherData?: LauncherData;
}

export default function Navigation({
  displayName,
  profilePicture,
  isAdmin = false,
  brandName = "Applicator",
  brandIcon,
  authorizations = [],
  isAssumedIdentity = false,
  launcherData,
}: NavigationProps) {
  const router = useRouter();
  const [showAssumeModal, setShowAssumeModal] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/system/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.unassumed) {
          // User unassumed identity, reload the page
          window.location.reload();
        } else {
          // Normal logout, redirect to login
          router.push("/system/login");
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAssumeIdentity = async (userId: string) => {
    try {
      const response = await fetch("/api/system/auth/assume-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Reload the page to reflect the new identity
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to assume identity");
      }
    } catch (error) {
      console.error("Assume identity failed:", error);
      alert("Failed to assume identity");
    }
  };

  const hasAssumeIdentity = authorizations.includes("system:assume-identity");
  const isDeveloper = authorizations.includes("system:developer");

  const menuOptions = [
    {
      label: "User Settings",
      icon: <Icon name="user" size={16} />,
      href: "/user/settings",
      onClick: () => router.push("/user/settings"),
    },
    ...(isAdmin
      ? [
          {
            label: "System Settings",
            icon: <Icon name="settings" size={16} />,
            href: "/system/settings",
            onClick: () => router.push("/system/settings"),
          },
        ]
      : []),
    ...(isDeveloper
      ? [
          {
            label: "Development Menu",
            icon: <Icon name="code" size={16} />,
            href: "/dev",
            onClick: () => router.push("/dev"),
          },
        ]
      : []),
    ...(hasAssumeIdentity
      ? [
          {
            label: "Assume Identity",
            icon: <Icon name="users" size={16} />,
            onClick: () => setShowAssumeModal(true),
          },
        ]
      : []),
    {
      label: isAssumedIdentity ? "Logout (Unassume Identity)" : "Logout",
      icon: <Icon name="logout" size={16} />,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <nav className={styles.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {launcherData && (
            <button
              className={styles.iconButton}
              onClick={() => setShowLauncher(true)}
              aria-label="App launcher"
            >
              <Icon name="sandwich" size={20} />
            </button>
          )}
          <a
            href="/"
            className={styles.title}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            textDecoration: "none",
          }}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              router.push("/");
            }
          }}
        >
          {brandIcon && (
            <img
              src={brandIcon}
              alt="Brand icon"
              style={{
                height: "32px",
                width: "32px",
                objectFit: "contain",
              }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: "16px" }}>{brandName}</h1>
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <NotificationBell />
          <ButtonMenu options={menuOptions}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ProfileIndicator
                displayName={displayName}
                profilePicture={profilePicture}
              />
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transition: "transform 0.2s" }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </ButtonMenu>
        </div>
      </nav>

      {showAssumeModal && (
        <AssumeIdentityModal
          onClose={() => setShowAssumeModal(false)}
          onAssumeIdentity={handleAssumeIdentity}
        />
      )}

      {showLauncher && launcherData && (
        <AppLauncherModal
          launcherData={launcherData}
          onClose={() => setShowLauncher(false)}
        />
      )}
    </>
  );
}
