import path from "node:path";

import { Volume, createFsFromVolume } from "memfs";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack from "webpack";

/**
 * @param {import("webpack").Configuration} config Webpack configuration
 * @returns {import("webpack").Compiler} Webpack compiler
 */
export default function getCompiler(config = {}) {
  const compiler = webpack({
    mode: "development",
    devtool: config.devtool || false,
    context: path.resolve(__dirname, "../fixtures"),
    optimization: {
      minimize: false,
    },
    output: {
      pathinfo: false,
      path: path.resolve(__dirname, "../outputs"),
      filename: "[name].js",
      chunkFilename: "[id].[name].js",
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].css",
        chunkFilename: "[id].[name].css",
      }),
    ],
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },
    ...config,
  });

  if (!config.outputFileSystem) {
    compiler.outputFileSystem = createFsFromVolume(new Volume());
  }

  return compiler;
}
