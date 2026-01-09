const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
    library: {
      type: "module",
    },
    module: true,
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: [/node_modules/, /src\/api/],
      },
      {
        test: /\.css$/,
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
        {
          from: "src/apps",
          to: "apps",
        },
        {
          from: "src/widgets",
          to: "widgets",
        },
      ],
    }),
  ],
};
