"use client";

import React, { useState } from "react";
import DrawerLayout from "@/lib/components/utility/DrawerLayout";
import { IconName } from "@/lib/components/utility/Icon";

interface SettingsDrawerLayoutProps {
  nav: React.ReactNode;
  children: React.ReactNode;
  navTitle?: string;
  navIconName?: IconName;
}

export default function SettingsDrawerLayout({
  nav,
  children,
  navTitle = "Navigation",
  navIconName = "hamburger",
}: SettingsDrawerLayoutProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <DrawerLayout
      style={{ flex: 1 }}
      leftPanel={{
        open: navOpen,
        type: "inline",
        width: 33,
        closeable: true,
        title: navTitle,
        openable: true,
        iconName: navIconName,
        variant: "bordered",
        onClose: () => setNavOpen(false),
        onOpen: () => setNavOpen(true),
        children: nav,
      }}
    >
      <div
        style={{
          padding: "20px",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </DrawerLayout>
  );
}
