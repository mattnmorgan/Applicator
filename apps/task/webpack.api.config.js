const path = require('path');
const fs = require('fs');

// Find all API handler files
const apiDir = path.resolve(__dirname, 'src/api');
const handlers = fs.readdirSync(apiDir)
  .filter(file => file.endsWith('.ts') && file !== 'index.ts')
  .reduce((entries, file) => {
    const name = file.replace('.ts', '');
    entries[name] = `./src/api/${file}`;
    return entries;
  }, {});

module.exports = {
  entry: handlers,
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist/api'),
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
  },
  mode: 'production',
};
