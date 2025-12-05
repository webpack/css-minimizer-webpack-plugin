import path from "node:path";

import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

import CssMinimizerPlugin from "../src";

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAsset,
  readAssets,
} from "./helpers";

describe('"minify" option', () => {
  it('should work with "csso" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      parallel: false,
      minify: async (data, inputSourceMap) => {
        const csso = require("csso");

        const [[filename, input]] = Object.entries(data);
        const minifiedCss = csso.minify(input, {
          filename,
          sourceMap: inputSourceMap,
        });

        return {
          code: minifiedCss.css,
          map: minifiedCss.map && minifiedCss.map.toJSON(),
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(stats.compilation.errors).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "clean-css" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: async (data) => {
        const CleanCSS = require("clean-css");

        const [[filename, input]] = Object.entries(data);

        // Bug in `clean-css`
        // `clean-css` doesn't work with URLs in `sources`
        const minifiedCss = await new CleanCSS().minify({
          [filename]: {
            styles: input,
            // sourceMap: inputMap,
          },
        });

        return {
          code: minifiedCss.styles,
          // map: minifiedCss.sourceMap.toJSON(),
          warnings: minifiedCss.warnings,
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work with empty code", async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: async () => ({
        code: "",
      }),
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work if minify is array && minimizerOptions is array", async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: [
        { test: ".one{background: white;}" },
        { test: ".two{background: white;}" },
        { test: ".three{background: white;}" },
      ],
      minify: [
        (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.one{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.two{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.three{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work if minify is array && minimizerOptions is object", async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: { test: ".one{background: white;}" },
      minify: [
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.one{color: red;}\n/*HERE*/${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `/*HERE*/${minimizerOptions.test}\n${input}\n.two{color: red;}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.three{color: red;}\n`,
            map: inputMap,
          };
        },
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify" minifier and parser option as "String"', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        entry: path.join(__dirname, "fixtures", "sugarss.js"),
      },
      module: {},
      plugins: [
        new CopyPlugin({
          patterns: [
            {
              context: path.join(__dirname, "fixtures", "sss"),
              from: "index.sss",
            },
          ],
        }),
        new MiniCssExtractPlugin({
          filename: "[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      test: /\.(css|sss)$/i,
      minimizerOptions: {
        processorOptions: {
          parser: "sugarss",
        },
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('should work with "CssMinimizerPlugin.cssoMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cssoMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssoMinify" minifier and generate source map', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cssoMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssoMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minify: [CssMinimizerPlugin.cssoMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cleanCssMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cleanCssMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cleanCssMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cleanCssMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cleanCssMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minify: [CssMinimizerPlugin.cleanCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.esbuildMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.esbuildMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.esbuildMinify" minifier and emit warnings', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "wrong-calc.css"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.esbuildMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.esbuildMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.esbuildMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.esbuildMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minify: [CssMinimizerPlugin.esbuildMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify", "CssMinimizerPlugin.cssoMinify" and "CssMinimizerPlugin.cleanCssMinify" minifiers', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: [
        CssMinimizerPlugin.cssnanoMinify,
        CssMinimizerPlugin.cssoMinify,
        CssMinimizerPlugin.cleanCssMinify,
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify", "CssMinimizerPlugin.cssoMinify" and "CssMinimizerPlugin.cleanCssMinify" minifiers and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "foo.css"),
      },
    });

    new CssMinimizerPlugin({
      minify: [
        CssMinimizerPlugin.cssnanoMinify,
        CssMinimizerPlugin.cssoMinify,
        CssMinimizerPlugin.cleanCssMinify,
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.parcelCssMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.parcelCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.parcelCssMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.parcelCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.parcelCssMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.parcelCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.parcelCssMinify" minifier and options for "@parcel/css"', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "nesting.css"),
      },
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        targets: {
          ie: 11,
        },
        drafts: {
          nesting: true,
        },
      },
      minify: [CssMinimizerPlugin.parcelCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.lightningCssMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.lightningCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.lightningCssMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.lightningCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.lightningCssMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.lightningCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.lightningCssMinify" minifier and options for "lightningcss"', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "nesting.css"),
      },
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        targets: {
          ie: 11,
        },
        drafts: {
          nesting: true,
        },
      },
      minify: [CssMinimizerPlugin.lightningCssMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.swcMinify" minifier', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.swcMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  // Need improve package for source map generation
  it('should work with "CssMinimizerPlugin.swcMinify" minifier and generate source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.swcMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.swcMinify" minifier and generate source maps #2', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "foo/[name].css",
          chunkFilename: "foo/[id].[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.swcMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  // TODO improve test when options will come
  it('should work with "CssMinimizerPlugin.swcMinify" minifier and options for "swcMinify"', async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "nesting.css"),
      },
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {},
      minify: [CssMinimizerPlugin.swcMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work throw an error if minimizer function doesn't return", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async () => ({
        code: null,
      }),
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work throw an error if minimizer function doesn't return #2", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async () => ({
        code: undefined,
      }),
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work and allow to return errors and warnings from custom function", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async () => ({
        code: ".test { color: red; }",
        warnings: ["Warning 1", new Error("Warning 2")],
        errors: ["Error 1", new Error("Error 2")],
      }),
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work and allow to return errors and warnings from custom function without code", async () => {
    const compiler = getCompiler({
      entry: {
        foo: path.join(__dirname, "fixtures", "sourcemap", "foo.scss"),
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async () => ({
        warnings: ["Warning 1", new Error("Warning 2")],
        errors: ["Error 1", new Error("Error 2")],
      }),
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });
});
