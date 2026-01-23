import path from "path";
import { createRequire } from "module";

/**
 * Dynamically loads a module from an absolute or relative path.
 * Clears the require cache before loading to ensure fresh content.
 *
 * @param scriptPath - The path to the module to load
 * @returns The loaded module
 */
export function loadModule<T = any>(scriptPath: string): T {
  const require = createRequire(import.meta.url || __filename);
  const absolutePath = path.resolve(scriptPath);

  // Clear cache to ensure fresh load
  delete require.cache[absolutePath];

  return require(absolutePath);
}
