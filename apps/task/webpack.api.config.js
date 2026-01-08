const path = require('path');
const fs = require('fs');

// Find all API handler files
const apiDir = path.resolve(__dirname, 'src/api');
const handlers = fs.readdirSync(apiDir)
  .filter(file => file.endsWith('.ts') && file !== 'index.ts')
  .reduce((entries, file) => {
    const name = file.replace('.ts', '');
    entries[`api/${name}`] = `./src/api/${file}`;
    return entries;
  }, {});

// Find all system handler files
const systemDir = path.resolve(__dirname, 'src/system');
if (fs.existsSync(systemDir)) {
  const systemHandlers = fs.readdirSync(systemDir)
    .filter(file => file.endsWith('.ts'))
    .reduce((entries, file) => {
      const name = file.replace('.ts', '');
      entries[`system/${name}`] = `./src/system/${file}`;
      return entries;
    }, {});

  Object.assign(handlers, systemHandlers);
}

module.exports = {
  entry: handlers,
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: {
      type: 'commonjs2',
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../..'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.webpack.json',
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Mark Next.js modules as external since they'll be available in the runtime
    'next/server': 'commonjs2 next/server',
    // Mark ioredis as external since it's used by the SDK and available in main app
    'ioredis': 'commonjs2 ioredis',
    // Mark uuid as external (used by SDK)
    'uuid': 'commonjs2 uuid',
  },
  mode: 'production',
};
