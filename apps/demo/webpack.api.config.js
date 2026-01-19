const path = require("path");
const fs = require("fs");

// Helper to recursively find all TS files
function findTsFiles(dir, prefix = "") {
  const entries = {};

  if (!fs.existsSync(dir)) {
    return entries;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recurse into subdirectory
      const subEntries = findTsFiles(fullPath, prefix ? `${prefix}/${file}` : file);
      Object.assign(entries, subEntries);
    } else if (file.endsWith(".ts") && file !== "index.ts") {
      const name = file.replace(".ts", "");
      const entryName = prefix ? `${prefix}/${name}` : name;
      entries[`api/${entryName}`] = path.join(dir, file);
    }
  }

  return entries;
}

// Find all API handler files (including nested directories)
const apiDir = path.resolve(__dirname, "src/api");
const handlers = findTsFiles(apiDir);

// Find all system handler files
const systemDir = path.resolve(__dirname, "src/system");
if (fs.existsSync(systemDir)) {
  const systemFiles = fs.readdirSync(systemDir)
    .filter(file => file.endsWith(".ts"))
    .reduce((entries, file) => {
      const name = file.replace(".ts", "");
      entries[`system/${name}`] = `./src/system/${file}`;
      return entries;
    }, {});

  Object.assign(handlers, systemFiles);
}

// Find all agent files
const agentsDir = path.resolve(__dirname, "src/agents");
if (fs.existsSync(agentsDir)) {
  const agentFiles = fs.readdirSync(agentsDir)
    .filter(file => file.endsWith(".ts"))
    .reduce((entries, file) => {
      const name = file.replace(".ts", "");
      entries[`agents/${name}`] = `./src/agents/${file}`;
      return entries;
    }, {});

  Object.assign(handlers, agentFiles);
}

module.exports = {
  entry: handlers,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: {
      type: "commonjs2",
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "../.."),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.webpack.json",
          },
        },
        exclude: /node_modules/,
      },
    ],
    parser: {
      javascript: {
        // Convert dynamic import() to eager (sync) loading
        // This prevents async chunk creation for dynamically imported modules
        dynamicImportMode: "eager",
      },
    },
  },
  externals: {
    // Mark Next.js modules as external since they'll be available in the runtime
    "next/server": "commonjs2 next/server",
    // Mark ioredis as external since it's used by the SDK and available in main app
    ioredis: "commonjs2 ioredis",
    // Mark uuid as external (used by SDK)
    uuid: "commonjs2 uuid",
  },
  optimization: {
    // Disable all chunk splitting - each handler must be self-contained
    // because they're loaded individually from storage at runtime
    splitChunks: false,
    runtimeChunk: false,
  },
  mode: "production",
};
