<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![tests][tests]][tests-url]
[![cover][cover]][cover-url]
[![discussion][discussion]][discussion-url]
[![size][size]][size-url]

# css-minimizer-webpack-plugin

This plugin uses [cssnano](https://cssnano.github.io/cssnano/) to optimize and minify your CSS.

It serves as a more accurate alternative to [optimize-css-assets-webpack-plugin](https://github.com/NMFR/optimize-css-assets-webpack-plugin), with better support for source maps, assets with query strings, caching, and parallel processing.

## Getting Started

To begin, you'll need to install `css-minimizer-webpack-plugin`:

```console
npm install css-minimizer-webpack-plugin --save-dev
```

or

```console
yarn add -D css-minimizer-webpack-plugin
```

or

```console
pnpm add -D css-minimizer-webpack-plugin
```

Then add the plugin to your `webpack` configuration. For example:

**webpack.config.js**

```js
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  optimization: {
    minimizer: [
      // For webpack v5, you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line // `...`,
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [new MiniCssExtractPlugin()],
};
```

> [!NOTE]
>
> This enables CSS optimization only in production mode by default.

To enable it in development mode as well, set the `optimization.minimize` option to `true`:

**webpack.config.js**

```js
// [...]
module.exports = {
  optimization: {
    // [...]
    minimize: true,
  },
};
```

Finally, run Webpack using your preferred method.

## Note about source maps

**This plugin works only with `source-map`, `inline-source-map`, `hidden-source-map` and `nosources-source-map` values for the [`devtool`](https://webpack.js.org/configuration/devtool/) option.**

Why? Because CSS support only these source map types.

The plugin respects the [`devtool`](https://webpack.js.org/configuration/devtool/) setting and uses the `SourceMapDevToolPlugin` internally.

Using a supported `devtool` value enables source map generation.

Enabling the `columns` option in `SourceMapDevToolPlugin` also allows source map generation.

Use source maps to map error message locations to their original modules (note that this may slow down compilation).

If you use your own `minify` function please refer to the `minify` section for correct handling of source maps.

## Options

|                    Name                     |                      Type                      |              Default               | Description                                                                                      |
| :-----------------------------------------: | :--------------------------------------------: | :--------------------------------: | :----------------------------------------------------------------------------------------------- |
|             **[`test`](#test)**             |    `String\|RegExp\|Array<String\|RegExp>`     |         `/\.css(\?.*)?$/i`         | Test to match files against.                                                                     |
|          **[`include`](#include)**          |    `String\|RegExp\|Array<String\|RegExp>`     |            `undefined`             | Files to include.                                                                                |
|          **[`exclude`](#exclude)**          |    `String\|RegExp\|Array<String\|RegExp>`     |            `undefined`             | Files to exclude.                                                                                |
|         **[`parallel`](#parallel)**         |               `Boolean\|Number`                |               `true`               | Enable or disable multi-process parallel running.                                                |
|           **[`minify`](#minify)**           |          `Function\|Array<Function>`           | `CssMinimizerPlugin.cssnanoMinify` | Allows to override default minify function.                                                      |
| **[`minimizerOptions`](#minimizeroptions)** |            `Object\|Array<Object>`             |      `{ preset: 'default' }`       | Cssnano optimisations [options](https://cssnano.github.io/cssnano/docs/what-are-optimisations/). |
|   **[`warningsFilter`](#warningsfilter)**   | `Function<(warning, file, source) -> Boolean>` |            `() => true`            | Allows filtering of css-minimizer warnings.                                                      |

### `test`

- Type: `String|RegExp|Array<String|RegExp>`
- Default: `/\.css(\?.*)?$/i`

Test to match files against.

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        test: /\.foo\.css$/i,
      }),
    ],
  },
};
```

### `include`

- Type: `String|RegExp|Array<String|RegExp>`
- Default: `undefined`

Files to include.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        include: /\/includes/,
      }),
    ],
  },
};
```

### `exclude`

- Type: `String|RegExp|Array<String|RegExp>`
- Default: `undefined`

Files to exclude.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        exclude: /\/excludes/,
      }),
    ],
  },
};
```

### `parallel`

- Type: `Boolean|Number`
- Default: `true`

Use multi-process parallel running to improve the build speed.

The default number of concurrent runs: `os.cpus().length - 1` or `os.availableParallelism() - 1` (if this function is supported).

> ℹ️ Parallelization can speed up your build significantly and is therefore **highly recommended**.
> If a parallelization is enabled, the packages in `minimizerOptions` must be required via strings (`packageName` or `require.resolve(packageName)`). Read more in [`minimizerOptions`](#minimizeroptions)

#### `Boolean`

Enable or disable multi-process parallel running.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        parallel: true,
      }),
    ],
  },
};
```

#### `Number`

Enable multi-process parallel running and specify the number of concurrent runs.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        parallel: 4,
      }),
    ],
  },
};
```

### `minify`

- Type: `Function|Array<Function>`
- Default: `CssMinimizerPlugin.cssnanoMinify`

Overrides the default minify function.

By default, plugin uses [cssnano](https://github.com/cssnano/cssnano) package.

> This is useful when using or testing unpublished versions or forks.

Possible options:

- `CssMinimizerPlugin.cssnanoMinify`
- `CssMinimizerPlugin.cssoMinify`
- `CssMinimizerPlugin.cleanCssMinify`
- `CssMinimizerPlugin.esbuildMinify`
- `CssMinimizerPlugin.lightningCssMinify` (previously`CssMinimizerPlugin.parcelCssMinify`, the package was renamed, but we keep it for backward compatibility)
- `async (data, inputMap, minimizerOptions) => {return {code: "a{color: red}", map: "...", warnings: [], errors: []}}`

> [!WARNING]
>
> **Always use `require` inside `minify` function when `parallel` option is enabled**.

#### `Function`

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          level: {
            1: {
              roundingPrecision: "all=3,px=5",
            },
          },
        },
        minify: CssMinimizerPlugin.cleanCssMinify,
      }),
    ],
  },
};
```

#### `Array`

If an array of functions is passed to the `minify` option, the `minimizerOptions` must also be an array.

The function index in the `minify` array corresponds to the options object with the same index in the `minimizerOptions` array.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: [
          {}, // Options for the first function (CssMinimizerPlugin.cssnanoMinify)
          {}, // Options for the second function (CssMinimizerPlugin.cleanCssMinify)
          {}, // Options for the third function
        ],
        minify: [
          CssMinimizerPlugin.cssnanoMinify,
          CssMinimizerPlugin.cleanCssMinify,
          async (data, inputMap, minimizerOptions) =>
            //  Custom minifier function
            ({
              code: "a{color: red}",
              map: '{"version": "3", ...}',
              warnings: [],
              errors: [],
            }),
        ],
      }),
    ],
  },
};
```

### `minimizerOptions`

- Type: `Object|Array<Object>`
- Default: `{ preset: 'default' }`

Cssnano optimisations [options](https://cssnano.co/docs/what-are-optimisations/).

#### `Object`

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
};
```

#### `Array`

The function index in the `minify` array corresponds to the options object with the same index in the `minimizerOptions` array.

If you use `minimizerOptions` like object, all `minify` function accept it.

> If parallelization is enabled, the packages in `minimizerOptions` must be referenced via strings (`packageName` or `require.resolve(packageName)`). In this case, we shouldn't use `require`/`import`.

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: require.resolve("cssnano-preset-simple"),
        },
      }),
    ],
  },
};
```

##### `processorOptions` (⚠ only cssnano)

- Type: `Object`
- Default: `{ from: assetName }`

Allows filtering options [`processoptions`](https://postcss.org/api/#processoptions) for the cssnano.

The `parser`,` stringifier` and `syntax` can be either a function or a string indicating the module that will be imported.

> [!WARNING]
>
> **If any of these options are passed as a function, the `parallel` option must be disabled.**.

```js
import sugarss from "sugarss";

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        parallel: false,
        minimizerOptions: {
          processorOptions: {
            parser: sugarss,
          },
        },
      }),
    ],
  },
};
```

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          processorOptions: {
            parser: "sugarss",
          },
        },
      }),
    ],
  },
};
```

### `warningsFilter`

- Type: `Function<(warning, file, source) -> Boolean>`
- Default: `() => true`

Filter css-minimizer warnings (By default [cssnano](https://github.com/cssnano/cssnano)).

Return `true` to keep the warning, or a falsy value (`false`/`null`/`undefined`) to suppress it.

> [!WARNING]
>
> The `source` parameter will be `undefined` unless source maps are enabled.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        warningsFilter: (warning, file, source) => {
          if (/Dropping unreachable code/i.test(warning)) {
            return true;
          }

          if (/file\.css/i.test(file)) {
            return true;
          }

          if (/source\.css/i.test(source)) {
            return true;
          }

          return false;
        },
      }),
    ],
  },
};
```

## Examples

### Use sourcemaps

Don't forget to enable `sourceMap` options for all loaders.

```js
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { sourceMap: true } },
          { loader: "sass-loader", options: { sourceMap: true } },
        ],
      },
    ],
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin()],
  },
  plugins: [new MiniCssExtractPlugin()],
};
```

### Remove all comments

Remove all comments, including those starting with `/*!`.

```js
module.exports = {
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
};
```

### Using custom minifier [csso](https://github.com/css/csso)

**webpack.config.js**

```js
module.exports = {
  // Uncomment if you need source maps
  // devtool: "source-map",
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.cssoMinify,
        // Uncomment this line for options
        // minimizerOptions: { restructure: false },
      }),
    ],
  },
};
```

### Using custom minifier [clean-css](https://github.com/jakubpawlowicz/clean-css)

**webpack.config.js**

```js
module.exports = {
  // Uncomment if you need source maps
  // devtool: "source-map",
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.cleanCssMinify,
        // Uncomment this line for options
        // minimizerOptions: { compatibility: 'ie11,-properties.merging' },
      }),
    ],
  },
};
```

### Using custom minifier [esbuild](https://github.com/evanw/esbuild)

**webpack.config.js**

```js
module.exports = {
  // Uncomment if you need source maps
  // devtool: "source-map",
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.esbuildMinify,
      }),
    ],
  },
};
```

### Using custom minifier [lightningcss](https://github.com/parcel-bundler/lightningcss), previously `@parcel/css`

**webpack.config.js**

```js
module.exports = {
  // devtool: "source-map", // Uncomment for source maps
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.lightningCssMinify,
        // Uncomment this line for options
        // minimizerOptions: { targets: { ie: 11 }, drafts: { nesting: true } },
      }),
    ],
  },
};
```

### Using custom minifier [swc](https://github.com/swc-project/swc)

**webpack.config.js**

```js
module.exports = {
  // devtool: "source-map", // Uncomment for source maps
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.swcMinify,
        // Uncomment this line for options
        // minimizerOptions: {},
      }),
    ],
  },
};
```

## Contributing

We welcome all contributions!

If you're new here, please take a moment to review our contributing guidelines.

[CONTRIBUTING](./.github/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/css-minimizer-webpack-plugin.svg
[npm-url]: https://npmjs.com/package/css-minimizer-webpack-plugin
[node]: https://img.shields.io/node/v/css-minimizer-webpack-plugin.svg
[node-url]: https://nodejs.org
[tests]: https://github.com/webpack/css-minimizer-webpack-plugin/workflows/css-minimizer-webpack-plugin/badge.svg
[tests-url]: https://github.com/webpack/css-minimizer-webpack-plugin/actions
[cover]: https://codecov.io/gh/webpack/css-minimizer-webpack-plugin/branch/main/graph/badge.svg
[cover-url]: https://codecov.io/gh/webpack/css-minimizer-webpack-plugin
[discussion]: https://img.shields.io/github/discussions/webpack/webpack
[discussion-url]: https://github.com/webpack/webpack/discussions
[size]: https://packagephobia.now.sh/badge?p=css-minimizer-webpack-plugin
[size-url]: https://packagephobia.now.sh/result?p=css-minimizer-webpack-plugin
