import Manager from './apps/Manager';
import HomeWidget from './widgets/HomeWidget';
import SettingsWidget from './widgets/SettingsWidget';
import SystemSettingsWidget from './widgets/SystemSettingsWidget';

// Export apps for sub-app loading
export const apps = {
  Manager, // Main sub-app component
};

// Export widgets for widget loading
export const widgets = {
  HomeWidget,
  SettingsWidget,
  SystemSettingsWidget,
};
