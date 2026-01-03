/**
 * Global type definitions for the Vibe Applicator plugin system
 */

import { ComponentType } from 'react';

/**
 * Widget component type
 */
export type WidgetComponent = ComponentType<Record<string, unknown>>;

/**
 * App export structure stored in the global namespace
 */
export interface AppExports {
  AppMount: (container: HTMLElement, context: { appId: string }) => void;
  AppUnmount: () => void;
  widgets: Record<string, WidgetComponent>;
}

/**
 * Global namespace for all Vibe Applicator plugins
 * Prevents conflicts between multiple loaded apps
 */
export interface ApplicatorPluginsNamespace {
  [appId: string]: AppExports;
}

declare global {
  interface Window {
    /**
     * Global namespace for all Vibe Applicator plugins
     *
     * Usage:
     * ```typescript
     * const widget = window.__APPLICATOR_PLUGINS__?.['my-app']?.widgets?.['HomeWidget'];
     * const appExports = window.__APPLICATOR_PLUGINS__?.['my-app'];
     * appExports?.AppMount(container, { appId: 'my-app' });
     * ```
     */
    __APPLICATOR_PLUGINS__?: ApplicatorPluginsNamespace;
  }
}

export {};
