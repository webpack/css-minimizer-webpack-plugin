import path from "node:path";

import { TraceMap } from "@jridgewell/trace-mapping";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import RequestShortener from "webpack/lib/RequestShortener";

import CssMinimizerPlugin from "../src/index";

import {
  EmitNewAsset,
  ModifyExistingAsset,
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAsset,
  readAssets,
} from "./helpers";

describe("CssMinimizerPlugin", () => {
  const rawSourceMap = {
    version: 3,
    file: "test.css",
    names: ["bar", "baz", "n"],
    sources: ["one.css", "two.css"],
    sourceRoot: "http://example.com/www/js/",
    mappings:
      "CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA",
  };

  const emptyRawSourceMap = {
    version: 3,
    sources: [],
    mappings: "",
  };

  it("should respect the hash options #1", async () => {
    const compiler = getCompiler({
      output: {
        pathinfo: false,
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        chunkFilename: "[id].[name].js",
        hashDigest: "hex",
        hashDigestLength: 20,
        hashFunction: "sha256",
        hashSalt: "salt",
      },
      entry: {
        entry: path.join(__dirname, "fixtures", "test", "foo.css"),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { discardEmpty: false }],
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should write stdout and stderr of workers to stdout and stderr of main process in parallel mode", async () => {
    const { write: stdoutWrite } = process.stdout;
    const { write: stderrWrite } = process.stderr;

    let stdoutOutput = "";
    let stderrOutput = "";

    process.stdout.write = (str) => {
      stdoutOutput += str;
    };

    process.stderr.write = (str) => {
      stderrOutput += str;
    };

    const compiler = getCompiler({
      entry: {
        one: path.join(__dirname, "fixtures", "entry.js"),
        two: path.join(__dirname, "fixtures", "entry.js"),
      },
    });

    new CssMinimizerPlugin({
      parallel: true,
      minify: () => {
        process.stdout.write("stdout\n");

        process.stderr.write("stderr\n");

        return { code: ".minify {};" };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(stdoutOutput).toMatchSnapshot("process stdout output");
    expect(stderrOutput).toMatchSnapshot("process stderr output");
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  });

  it("isSourceMap method", () => {
    expect(CssMinimizerPlugin.isSourceMap(null)).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap()).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap({})).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap([])).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap("foo")).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap({ version: 3 })).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap({ sources: "" })).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap({ mappings: [] })).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap({ version: 3, sources: "" })).toBe(
      false,
    );
    expect(CssMinimizerPlugin.isSourceMap({ version: 3, mappings: [] })).toBe(
      false,
    );
    expect(CssMinimizerPlugin.isSourceMap({ sources: "", mappings: [] })).toBe(
      false,
    );
    expect(
      CssMinimizerPlugin.isSourceMap({ version: 3, sources: "", mappings: [] }),
    ).toBe(false);
    expect(CssMinimizerPlugin.isSourceMap(rawSourceMap)).toBe(true);
    expect(CssMinimizerPlugin.isSourceMap(emptyRawSourceMap)).toBe(true);
  });

  it("buildError method", () => {
    const error = new Error("Message");

    error.stack = null;

    expect(CssMinimizerPlugin.buildError(error, "test.css")).toMatchSnapshot();

    const errorWithLineAndCol = new Error("Message");

    errorWithLineAndCol.stack = null;
    errorWithLineAndCol.line = 1;
    errorWithLineAndCol.column = 1;

    expect(
      CssMinimizerPlugin.buildError(
        errorWithLineAndCol,
        "test.css",
        new TraceMap(rawSourceMap),
      ),
    ).toMatchSnapshot();

    const otherErrorWithLineAndCol = new Error("Message");

    otherErrorWithLineAndCol.stack = null;
    otherErrorWithLineAndCol.line = 1;
    otherErrorWithLineAndCol.column = 1;

    expect(
      CssMinimizerPlugin.buildError(
        otherErrorWithLineAndCol,
        "test.css",
        new TraceMap(rawSourceMap),
        new RequestShortener("/example.com/www/js/"),
      ),
    ).toMatchSnapshot();

    const errorWithStack = new Error("Message");

    errorWithStack.stack = "Stack";

    expect(
      CssMinimizerPlugin.buildError(errorWithStack, "test.css"),
    ).toMatchSnapshot();
  });

  it("buildWarning method", () => {
    expect(
      CssMinimizerPlugin.buildWarning("Warning test.css:1:1"),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning("Warning test.css:1:1", "test.css"),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning(
        "Warning test.css:1:1",
        "test.css",

        undefined,
        new TraceMap(rawSourceMap),
      ),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning(
        "Warning test.css:1:1",
        "test.css",

        undefined,
        new TraceMap(rawSourceMap),
        new RequestShortener("/example.com/www/js/"),
      ),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning(
        "Warning test.css:1:1",
        "test.css",
        () => true,
        new TraceMap(rawSourceMap),
        new RequestShortener("/example.com/www/js/"),
      ),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning(
        "Warning test.css:1:1",
        "test.css",
        () => false,
        new TraceMap(rawSourceMap),
        new RequestShortener("/example.com/www/js/"),
      ),
    ).toMatchSnapshot();
    expect(
      CssMinimizerPlugin.buildWarning(
        {
          message: "warning",
          line: 1,
          column: 1,
        },
        "test.css",

        undefined,
        new TraceMap(rawSourceMap),
        new RequestShortener("/example.com/www/js/"),
      ),
    ).toMatchSnapshot();
  });

  it("should work", async () => {
    const compiler = getCompiler({
      entry: path.join(__dirname, "fixtures", "entry.js"),
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work with empty files", async () => {
    const compiler = getCompiler({
      entry: path.join(__dirname, "fixtures", "empty.js"),
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should build error", () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "test", "foo.css"),
      },
      plugins: [
        new CopyPlugin({
          patterns: [
            {
              context: path.join(__dirname, "fixtures", "test"),
              from: "error.css",
            },
          ],
        }),
        new MiniCssExtractPlugin({
          filename: "[name].css",
          chunkFilename: "[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot("error");
      expect(getWarnings(stats)).toMatchSnapshot("warning");
    });
  });

  it("should throw error from postcss", () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "test", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: (data) => {
        const postcss = require("postcss");

        const plugin = () => {
          let erroredDecl;

          return {
            postcssPlugin: "error-plugin",
            Declaration(decl) {
              erroredDecl = decl;
            },
            OnceExit() {
              throw erroredDecl.error("Postcss error");
            },
          };
        };

        plugin.postcss = true;

        const [[filename, input]] = Object.entries(data);

        return postcss([plugin])
          .process(input, { from: filename, to: filename })
          .then((result) => result);
      },
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot("error");
      expect(getWarnings(stats)).toMatchSnapshot("warning");
    });
  });

  it("should build warning", () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "test", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: (data) => {
        const postcss = require("postcss");

        const plugin = () => ({
          postcssPlugin: "warning-plugin",
          Declaration(decl, { result }) {
            result.warn("Warning", {
              node: decl,
              word: "warning_word",
              index: 2,
              plugin: "warning-plugin",
            });
          },
        });

        plugin.postcss = true;

        const [[filename, input]] = Object.entries(data);

        return postcss([plugin])
          .process(input, { from: filename, to: filename })
          .then((result) => ({
            code: result.css,
            map: result.map,
            warnings: result.warnings(),
          }));
      },
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot("error");
      expect(getWarnings(stats)).toMatchSnapshot("warning");
    });
  });

  it("should work with assets using querystring", () => {
    const config = {
      devtool: "source-map",
      entry: {
        entry: path.join(__dirname, "fixtures", "foo.css"),
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "[name].css?v=test",
          chunkFilename: "[id].[name].css?v=test",
        }),
      ],
    };

    const compiler = getCompiler(config);

    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.css\?/.test(file)) {
          expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
        }

        if (/\.css.map/.test(file)) {
          expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
        }
      }
    });
  });

  it("should work with child compilation", async () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(__dirname, "fixtures", "entry.js"),
      },
      module: {
        rules: [
          {
            test: /entry.js$/i,
            use: [
              {
                loader: path.resolve(
                  __dirname,
                  "./helpers/emitAssetInChildCompilationLoader",
                ),
              },
            ],
          },
          {
            test: /.s?css$/i,
            use: [MiniCssExtractPlugin.loader, "css-loader"],
          },
        ],
      },
    });
    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work and show minimized assets in stats", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "entry.js"),
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);
    const stringStats = stats.toString();
    const printedCompressed = stringStats.match(/\[minimized]/g);

    expect(printedCompressed ? printedCompressed.length : 0).toBe(1);
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work and generate real content hash", async () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(__dirname, "fixtures", "entry.js"),
      },
      output: {
        pathinfo: false,
        path: path.resolve(__dirname, "dist"),
        filename: "[name].[contenthash].[chunkhash].[fullhash].js",
        chunkFilename: "[name].[contenthash].[chunkhash].[fullhash].js",
      },
      optimization: {
        minimize: false,
        realContentHash: true,
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "[name].[contenthash].[chunkhash].[fullhash].css",
          chunkFilename: "[name].[contenthash].[chunkhash].[fullhash].css",
        }),
      ],
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);
    const {
      compilation: {
        assets,
        options: { output },
      },
    } = stats;

    for (const assetName of Object.keys(assets)) {
      const [, webpackHash] = assetName.match(/^.+?\.(.+?)\..+$/);
      const { hashDigestLength, hashDigest, hashFunction } = output;

      const cryptoHash = require("webpack")
        .util.createHash(hashFunction)
        .update(readAsset(assetName, compiler, stats))
        .digest(hashDigest)
        .slice(0, hashDigestLength);

      expect(webpackHash).toBe(cryptoHash);
    }

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work and use memory cache out of box", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(0);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work and use memory cache when the "cache" option is "true"', async () => {
    const compiler = getCompiler({
      cache: true,
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(0);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work and use memory cache when the "cache" option is "true" and the asset has been changed', async () => {
    const compiler = getCompiler({
      cache: true,
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    new ModifyExistingAsset({ name: "foo.css" }).apply(compiler);

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(1);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work with source map and use memory cache when the "cache" option is "true"', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(8);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(0);

    expect(readAssets(compiler, newStats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work with source map and use memory cache when the "cache" option is "true" and the asset has been changed', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(8);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    new ModifyExistingAsset({ name: "foo.css" }).apply(compiler);

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(2);

    expect(readAssets(compiler, newStats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work with warnings and use memory cache when the "cache" option is "true"', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: (data) => {
        const postcss = require("postcss");

        const [[fileName, input]] = Object.entries(data);

        const plugin = () => ({
          postcssPlugin: "warning-plugin",
          OnceExit(decl, { result }) {
            result.warn(`Warning from ${result.opts.from}`, {
              plugin: "warning-plugin",
            });
          },
        });

        plugin.postcss = true;

        return postcss([plugin])
          .process(input, { from: fileName, to: fileName })
          .then((result) => ({
            code: result.css,
            map: result.map,
            error: result.error,
            warnings: result.warnings(),
          }));
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(0);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work with warnings and use memory cache when the "cache" option is "true" and the asset has been changed', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: (data) => {
        const postcss = require("postcss");

        const [[fileName, input]] = Object.entries(data);

        const plugin = () => ({
          postcssPlugin: "warning-plugin",
          OnceExit(decl, { result }) {
            result.warn(`Warning from ${result.opts.from}`, {
              plugin: "warning-plugin",
            });
          },
        });

        plugin.postcss = true;

        return postcss([plugin])
          .process(input, { from: fileName, to: fileName })
          .then((result) => ({
            code: result.css,
            map: result.map,
            error: result.error,
            warnings: result.warnings(),
          }));
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    new ModifyExistingAsset({ name: "foo.css" }).apply(compiler);

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(1);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it('should work and do not use memory cache when the "cache" option is "false"', async () => {
    const compiler = getCompiler({
      cache: false,
      entry: {
        foo: path.join(__dirname, "fixtures", "simple.js"),
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
          {
            test: /simple-emit.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader.js"),
          },
          {
            test: /simple-emit-2.js$/i,
            loader: require.resolve("./helpers/emitAssetLoader2.js"),
          },
        ],
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(stats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(stats)).toMatchSnapshot("errors");
    expect(getErrors(stats)).toMatchSnapshot("warnings");

    const newStats = await compile(compiler);

    expect(newStats.compilation.emittedAssets.size).toBe(5);

    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
  });

  it("should run plugin against assets added later by plugins", async () => {
    const compiler = getCompiler({
      output: {
        pathinfo: false,
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        chunkFilename: "[id].[name].js",
      },
      entry: {
        entry: path.join(__dirname, "fixtures", "test", "foo.css"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: ["css-loader"],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { discardEmpty: false }],
      },
    }).apply(compiler);
    new EmitNewAsset({ name: "newFile.css" }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });
});
