const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const LIBRARY_NAME = "FilesApp";

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
    library: {
      type: "umd",
      name: LIBRARY_NAME,
    },
    globalObject: "this",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "../../"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /src\/api/],
      },
      {
        test: /\.module\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "assets",
          to: "assets",
        },
        {
          from: "app.json",
          to: "app.json",
        },
        {
          from: "app.png",
          to: "app.png",
        },
      ],
    }),
  ],
};
