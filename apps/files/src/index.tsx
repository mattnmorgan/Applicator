import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HomeWidget from './widgets/HomeWidget';

// Export widgets for the plugin system
export { HomeWidget };

// Mount function called when the app is loaded
export function AppMount(container: HTMLElement, context: { appId: string }) {
  const root = createRoot(container);
  root.render(<App />);
}

// Unmount function called when leaving the app
export function AppUnmount() {
  // Cleanup if needed
}

// Expose functions and widgets globally with namespacing to prevent conflicts
if (typeof window !== 'undefined') {
  // Create app namespace if it doesn't exist
  if (!(window as any).__APPLICATOR_PLUGINS__) {
    (window as any).__APPLICATOR_PLUGINS__ = {};
  }

  // Store app-specific exports under the app ID
  (window as any).__APPLICATOR_PLUGINS__['files'] = {
    AppMount,
    AppUnmount,
    widgets: {
      HomeWidget,
    },
  };
}
