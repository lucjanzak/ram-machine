import path from "node:path";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import packageJson from "./package.json" with { type: "json" };
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import en from "./lang/en.json" with { type: "json" };
import pl from "./lang/pl.json" with { type: "json" };
const translations = {en, pl};
const languageInfo = Object.keys(translations).map(key => ({
  key,
  displayName: translations[key].languageName
}));
// console.log(languageInfo);

const packageVersion = packageJson.version;
const gitCommitHash = process.env.GIT_COMMIT_HASH;
if (gitCommitHash === undefined) {
  throw new Error("GIT_COMMIT_HASH environment variable not provided; please provide a valid value for GIT_COMMIT_HASH, or set it to an empty string")
}

const gitCommitHashShort = gitCommitHash.substring(0, 7);
const displayedVersion = ((packageVersion.includes("alpha") || packageVersion.includes("beta")) && gitCommitHash !== "") ? `${packageVersion}-${gitCommitHashShort}` : packageVersion;
const commonTemplateParameters = {
  packageVersion,
  gitCommitHash,
  gitCommitHashShort,
  displayedVersion
};
console.log("Creating template with parameters: ", commonTemplateParameters);

const config /*: webpack.Configuration*/ = {
  mode: "development",
  entry: "./src/ts/index.ts",
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "js/bundle.js",
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
      // TODO(optional): properly fix .ttfs not loading
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
    ...Object.keys(translations).map(lang => {
      if (!(lang in translations)) {
        throw new Error(`Unknown language: ${lang}`);
      }
      const templateParameters = Object.assign({}, commonTemplateParameters, {lang, t: translations[lang], languageInfo});
      return new HtmlWebpackPlugin({
        title: "Development",
        template: "./src/app.html",
        templateParameters,
        filename: `app_${lang}.html`
      });
    }),
    new MonacoWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/index.html", to: "index.html" },
        // { from: "src/404.html", to: "404.html" },
        { from: "public" },
        { from: "LICENSE.txt" },
      ],
    }),
  ],
};

export default config;
