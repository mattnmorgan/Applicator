import path from "path";
import Module, { createRequire } from "module";

// Patch module resolution so that scripts loaded from outside the project
// (e.g. compiled app handlers in system_storage) can resolve packages
// installed in the system project's node_modules.  Next.js installs its
// own require hook that bypasses globalPaths, so we hook _resolveFilename
// with a fallback instead.
const systemRequire = createRequire(
  path.resolve(process.cwd(), "package.json"),
);
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  isMain: boolean,
  options: any,
) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err: any) {
    if (err?.code === "MODULE_NOT_FOUND") {
      return systemRequire.resolve(request);
    }
    throw err;
  }
};

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
