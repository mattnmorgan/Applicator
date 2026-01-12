/**
 * Logging utilities
 * Provides logging functionality
 */

import LogManager from "@/lib/database/managers/log";

export const logger = {
  info: async (sender: string, message: string, userId: string = "system") => {
    const logManager = new LogManager();
    await logManager.createLog("info", message, sender);
  },

  warn: async (sender: string, message: string, userId: string = "system") => {
    const logManager = new LogManager();
    await logManager.createLog("warning", message, sender);
  },

  error: async (sender: string, message: string, userId: string = "system") => {
    const logManager = new LogManager();
    await logManager.createLog("error", message, sender);
  },

  debug: async (sender: string, message: string, userId: string = "system") => {
    const logManager = new LogManager();
    await logManager.createLog("debug", message, sender);
  },
};
