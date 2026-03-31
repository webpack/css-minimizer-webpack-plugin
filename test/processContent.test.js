import path from "node:path";

import { Volume, createFsFromVolume } from "memfs";
import webpack from "webpack";

import CssMinimizerPlugin from "../src/index";

import { compile, getErrors, getWarnings } from "./helpers";

/**
 * @param {import("webpack").Configuration} config Extra config
 * @returns {import("webpack").Compiler} Compiler
 */
function getCompilerWithNativeCSS(config = {}) {
  const compiler = webpack({
    mode: "production",
    devtool: false,
    context: path.resolve(__dirname, "fixtures"),
    entry: "./process-content.js",
    output: {
      pathinfo: false,
      path: path.resolve(__dirname, "outputs"),
      filename: "[name].js",
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          type: "css/module",
          parser: {
            exportType: "text",
          },
        },
      ],
    },
    optimization: {
      minimize: false,
    },
    experiments: {
      css: true,
    },
    ...config,
  });

  compiler.outputFileSystem = createFsFromVolume(new Volume());

  return compiler;
}

describe("processContent hook", () => {
  it("should minimize CSS embedded in JS via processContent hook", async () => {
    const compiler = getCompilerWithNativeCSS();

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    // Read the JS output and verify CSS was minimized
    const output = compiler.outputFileSystem.readFileSync(
      path.resolve(__dirname, "outputs/main.js"),
      "utf8",
    );

    // cssnano should minify "body {\n  color: red;\n}\na {\n  color: blue;\n}"
    // into something like "a,body{color:red}a{color:blue}" or similar
    expect(output).not.toContain("body {\\n");
    expect(output).toContain("color");
  });

  it("should not minimize CSS when name does not match test option", async () => {
    const compiler = getCompilerWithNativeCSS();

    new CssMinimizerPlugin({
      test: /\.scss$/,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    const output = compiler.outputFileSystem.readFileSync(
      path.resolve(__dirname, "outputs/main.js"),
      "utf8",
    );

    // CSS should NOT be minimized since test doesn't match .css files
    expect(output).toContain("color: red;");
  });

  it("should work alongside processAssets for standalone .css files", async () => {
    const MiniCssExtractPlugin = require("mini-css-extract-plugin");

    const compiler = webpack({
      mode: "production",
      devtool: false,
      context: path.resolve(__dirname, "fixtures"),
      entry: "./entry.js",
      output: {
        pathinfo: false,
        path: path.resolve(__dirname, "outputs"),
        filename: "[name].js",
        chunkFilename: "[id].[name].js",
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "[name].css",
        }),
      ],
      module: {
        rules: [
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, "css-loader"],
          },
        ],
      },
      optimization: {
        minimize: false,
      },
    });

    compiler.outputFileSystem = createFsFromVolume(new Volume());

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    // The standalone .css file should be minimized via processAssets
    const cssOutput = compiler.outputFileSystem.readFileSync(
      path.resolve(__dirname, "outputs/main.css"),
      "utf8",
    );

    expect(cssOutput).not.toContain("color: red");
  });
});
