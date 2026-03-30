import path from "node:path";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config /*: webpack.Configuration*/ = {
  mode: "development",
  entry: "./src/ts/app.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: "style-loader",
      },
      {
        test: /\.css$/,
        loader: "css-loader",
        options: {
          modules: false,
          url: false,
        },
      },
      // TODO: properly fix .ttfs not loading
      // {
      //   test: /\.ttf$/,
      //   use: ["file-loader"],
      // },
      // {
      // test: /\.(png|woff|woff2|eot|ttf|svg)$/,
      // type: "asset/resource",
      // use: "url-loader",
      // },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Development",
      template: "./src/index.html",
    }),
    new MonacoWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [{ from: "src/404.html", to: "404.html" }],
    }),
  ],
};

export default config;
