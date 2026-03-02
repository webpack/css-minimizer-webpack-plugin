import path from "node:path";

import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import sugarss from "sugarss";

import CssMinimizerPlugin from "../src/index";

import { compile, getCompiler, readAsset } from "./helpers";

describe('when applied with "minimizerOptions" option', () => {
  it('matches snapshot for "discardComments" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "discardComments.css",
        ),
      },
    });
    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardComments" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "discardComments.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { discardComments: false }],
      },
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

  it('matches snapshot for "discardComments" option (enable, with "removeAll" option)', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "discardComments.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { discardComments: { removeAll: true } }],
      },
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

  it('matches snapshot for "preset" option with require.resolve "String" value', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "order.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: require.resolve("cssnano-preset-default"),
      },
    }).apply(compiler);

    const compiler2 = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "order.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: require.resolve("cssnano-preset-default"),
      },
    }).apply(compiler2);

    const result1 = compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(
          "default-preset",
        );
      }
    });

    const result2 = compile(compiler2).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler2, stats)).toMatchSnapshot(
          "preset-simple",
        );
      }
    });

    return Promise.all([result1, result2]);
  });

  it('matches snapshot for "mergeRules" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "mergeRules.css",
        ),
      },
    });
    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "mergeRules" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "mergeRules.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { mergeRules: false }],
      },
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

  it('matches snapshot for "discardEmpty" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "discardEmpty.css",
        ),
      },
    });
    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardEmpty" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(
          __dirname,
          "fixtures",
          "minimizerOptions",
          "discardEmpty.css",
        ),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: ["default", { discardEmpty: false }],
      },
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

  it('matches snapshot for "parser" option with "Function" value', () => {
    const compiler = getCompiler({
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
      parallel: false,
      minimizerOptions: {
        processorOptions: {
          parser: sugarss,
        },
      },
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

  it('matches snapshot for "parser" option with "String" value', () => {
    const compiler = getCompiler({
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

  it('matches snapshot for "stringifier" option with "Function" value', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(__dirname, "fixtures", "entry.js"),
      },
    });
    new CssMinimizerPlugin({
      parallel: false,
      minimizerOptions: {
        processorOptions: {
          stringifier: sugarss,
        },
      },
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

  it('matches snapshot for "stringifier" option with "String" value', () => {
    const compiler = getCompiler({
      entry: {
        entry: path.join(__dirname, "fixtures", "entry.js"),
      },
    });
    new CssMinimizerPlugin({
      minimizerOptions: {
        processorOptions: {
          stringifier: "sugarss",
        },
      },
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

  it('matches snapshot for "syntax" option with "Function" value', () => {
    const compiler = getCompiler({
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
      parallel: false,
      minimizerOptions: {
        processorOptions: {
          syntax: sugarss,
        },
      },
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

  it('matches snapshot for "syntax" option with "String" value', () => {
    const compiler = getCompiler({
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
          syntax: "sugarss",
        },
      },
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
});
