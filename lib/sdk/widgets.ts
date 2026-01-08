/**
 * Widget Management SDK for Vibe Applicator
 *
 * Provides utilities for registering and managing widgets that plugins can expose
 */

import { getApp, updateApp } from "../db";
import { Widget } from "@/lib/database/types/app";

export class WidgetManager {
  private appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  /**
   * Register a widget for the app
   * @param widget Widget configuration
   */
  async registerWidget(widget: Widget): Promise<void> {
    const app = await getApp(this.appId);
    if (!app) {
      throw new Error(`App ${this.appId} not found`);
    }

    const widgets = app.widgets || [];

    // Check if widget with same component name already exists
    const existingIndex = widgets.findIndex(
      (w) => w.component === widget.component
    );
    if (existingIndex !== -1) {
      // Update existing widget
      widgets[existingIndex] = widget;
    } else {
      // Add new widget
      widgets.push(widget);
    }

    await updateApp(this.appId, { widgets });
  }

  /**
   * Unregister a widget by component name
   * @param componentName Name of the component to unregister
   */
  async unregisterWidget(componentName: string): Promise<void> {
    const app = await getApp(this.appId);
    if (!app) {
      throw new Error(`App ${this.appId} not found`);
    }

    const widgets = (app.widgets || []).filter(
      (w) => w.component !== componentName
    );
    await updateApp(this.appId, { widgets });
  }

  /**
   * Get all widgets registered by this app
   */
  async getWidgets(): Promise<Widget[]> {
    const app = await getApp(this.appId);
    if (!app) {
      throw new Error(`App ${this.appId} not found`);
    }

    return app.widgets || [];
  }

  /**
   * Get widgets by target type
   */
  async getWidgetsByTarget(
    target: "home" | "user-settings" | "system-settings"
  ): Promise<Widget[]> {
    const widgets = await this.getWidgets();
    return widgets.filter((w) => w.target === target);
  }
}

/**
 * Create a widget manager instance
 * @param appId ID of the app
 */
export function createWidgetManager(appId: string): WidgetManager {
  return new WidgetManager(appId);
}

export type { Widget };
