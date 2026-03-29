"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <DrawerLayout
      style={{ flex: 1 }}
      rounded={false}
      leftPanel={{
        open: navOpen,
        type: "inline",
        width: 33,
        closeable: true,
        title: navTitle,
        openable: true,
        iconName: navIconName,
        variant: "bordered",
        scrollable: false,
        contentPadding: 0,
        onClose: () => setNavOpen(false),
        onOpen: () => setNavOpen(true),
        children: (
          <div style={{ height: "100%", overflowY: "auto", padding: "16px", boxSizing: "border-box" }}>
            {nav}
          </div>
        ),
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
