const os = require("node:os");

const { validate } = require("schema-utils");

const { minify } = require("./minify");
const schema = require("./options.json");
const {
  cleanCssMinify,
  cssnanoMinify,
  cssoMinify,
  esbuildMinify,
  lightningCssMinify,
  memoize,
  parcelCssMinify,
  swcMinify,
  throttleAll,
} = require("./utils");

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("jest-worker").Worker} JestWorker */
/** @typedef {import("@jridgewell/trace-mapping").EncodedSourceMap & { sources: string[], sourcesContent?: string[], file: string }} RawSourceMap */
/** @typedef {import("webpack").Asset} Asset */
/** @typedef {import("postcss").ProcessOptions} ProcessOptions */
/** @typedef {import("postcss").Syntax} Syntax */
/** @typedef {import("postcss").Parser} Parser */
/** @typedef {import("postcss").Stringifier} Stringifier */
/** @typedef {import("@jridgewell/trace-mapping").TraceMap} TraceMap */

// eslint-disable-next-line jsdoc/reject-any-type
/** @typedef {any} EXPECTED_ANY */

/**
 * @typedef {Record<string, unknown>} CssNanoOptions
 * @property {string=} configFile Configuration file path
 * @property {string | [string, Record<string, unknown>] | undefined=} preset CSS nano preset
 */

/** @typedef {Error & { plugin?: string, text?: string, source?: string } | string} Warning */

/**
 * @typedef {object} WarningObject
 * @property {string} message Warning message
 * @property {string=} plugin Plugin name
 * @property {string=} text Warning text
 * @property {number=} line Line number
 * @property {number=} column Column number
 */

/**
 * @typedef {object} ErrorObject
 * @property {string} message Error message
 * @property {number=} line Line number
 * @property {number=} column Column number
 * @property {string=} stack Error stack trace
 */

/**
 * @typedef {object} MinimizedResult
 * @property {string} code Minimized code
 * @property {RawSourceMap=} map Source map
 * @property {(Error | ErrorObject | string)[]=} errors Errors
 * @property {(Warning | WarningObject | string)[]=} warnings Warnings
 */

/**
 * @typedef {{ [file: string]: string }} Input
 */

/**
 * @typedef {{ [key: string]: unknown }} CustomOptions
 */

/**
 * @template T
 * @typedef {T extends infer U ? U : CustomOptions} InferDefaultType
 */

/**
 * @template T
 * @typedef {T extends EXPECTED_ANY[] ? { [P in keyof T]?: InferDefaultType<T[P]> } : InferDefaultType<T>} MinimizerOptions
 */

/**
 * @template T
 * @callback BasicMinimizerImplementation
 * @param {Input} input
 * @param {RawSourceMap | undefined} sourceMap
 * @param {InferDefaultType<T>} minifyOptions
 * @returns {Promise<MinimizedResult> | MinimizedResult}
 */

/**
 * @typedef {object} MinimizeFunctionHelpers
 * @property {() => boolean | undefined=} supportsWorkerThreads Check if worker threads are supported
 */

/**
 * @template T
 * @typedef {T extends EXPECTED_ANY[] ? { [P in keyof T]: BasicMinimizerImplementation<T[P]> & MinimizeFunctionHelpers } : BasicMinimizerImplementation<T> & MinimizeFunctionHelpers} MinimizerImplementation
 */

/**
 * @template T
 * @typedef {object} InternalOptions
 * @property {string} name Name
 * @property {string} input Input
 * @property {RawSourceMap | undefined} inputSourceMap Input source map
 * @property {{ implementation: MinimizerImplementation<T>, options: MinimizerOptions<T> }} minimizer Minimizer
 */

/**
 * @typedef InternalResult
 * @property {{ code: string, map: RawSourceMap | undefined }[]} outputs - Outputs
 * @property {(Warning | WarningObject | string)[]} warnings - Warnings
 * @property {(Error | ErrorObject | string)[]} errors - Errors
 */

/** @typedef {undefined | boolean | number} Parallel */

/** @typedef {RegExp | string} Rule */
/** @typedef {Rule[] | Rule} Rules */

/** @typedef {(warning: Warning | WarningObject | string, file: string, source?: string) => boolean} WarningsFilter */

/**
 * @typedef {object} BasePluginOptions
 * @property {Rule=} test Test rule
 * @property {Rule=} include Include rule
 * @property {Rule=} exclude Exclude rule
 * @property {WarningsFilter=} warningsFilter Warnings filter
 * @property {Parallel=} parallel Parallel option
 */

/**
 * @template T
 * @typedef {JestWorker & { transform: (options: string) => Promise<InternalResult>, minify: (options: InternalOptions<T>) => Promise<InternalResult> }} MinimizerWorker
 */

/**
 * @typedef {ProcessOptions | { from?: string, to?: string, parser?: string | Syntax | Parser, stringifier?: string | Syntax | Stringifier, syntax?: string | Syntax }} ProcessOptionsExtender
 */

/**
 * @typedef {CssNanoOptions & { processorOptions?: ProcessOptionsExtender }} CssNanoOptionsExtended
 */

/**
 * @template T
 * @typedef {T extends CssNanoOptionsExtended ? { minify?: MinimizerImplementation<T> | undefined, minimizerOptions?: MinimizerOptions<T> | undefined } : { minify: MinimizerImplementation<T>, minimizerOptions?: MinimizerOptions<T> | undefined }} DefinedDefaultMinimizerAndOptions
 */

/**
 * @template T
 * @typedef {BasePluginOptions & { minimizer: { implementation: MinimizerImplementation<T>, options: MinimizerOptions<T> } }} InternalPluginOptions
 */

const warningRegex = /\s.+:+([0-9]+):+([0-9]+)/;

const getSerializeJavascript = memoize(() => require("serialize-javascript"));
const getTraceMapping = memoize(() => require("@jridgewell/trace-mapping"));

/**
 * @template [T=CssNanoOptionsExtended]
 */
class CssMinimizerPlugin {
  /**
   * @param {BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>=} options Plugin options
   */
  constructor(options) {
    validate(/** @type {Schema} */ (schema), options || {}, {
      name: "Css Minimizer Plugin",
      baseDataPath: "options",
    });

    const {
      minify = /** @type {BasicMinimizerImplementation<T>} */ (cssnanoMinify),
      minimizerOptions = /** @type {MinimizerOptions<T>} */ ({}),
      test = /\.css(\?.*)?$/i,
      warningsFilter = () => true,
      parallel = true,
      include,
      exclude,
    } = options || {};

    /**
     * @private
     * @type {InternalPluginOptions<T>}
     */
    this.options = {
      test,
      warningsFilter,
      parallel,
      include,
      exclude,
      minimizer: {
        implementation: /** @type {MinimizerImplementation<T>} */ (minify),
        options: minimizerOptions,
      },
    };
  }

  /**
   * @private
   * @param {unknown} input Input to check
   * @returns {boolean} Whether input is a source map
   */
  static isSourceMap(input) {
    // All required options for `new SourceMapConsumer(...options)`
    // https://github.com/mozilla/source-map#new-sourcemapconsumerrawsourcemap
    return Boolean(
      input &&
      typeof input === "object" &&
      input !== null &&
      "version" in input &&
      "sources" in input &&
      Array.isArray(input.sources) &&
      "mappings" in input &&
      typeof input.mappings === "string",
    );
  }

  /**
   * @private
   * @param {Warning | WarningObject | string} warning Warning
   * @param {string} file File name
   * @param {WarningsFilter=} warningsFilter Warnings filter
   * @param {TraceMap=} sourceMap Source map
   * @param {Compilation["requestShortener"]=} requestShortener Request shortener
   * @returns {Error & { hideStack?: boolean, file?: string } | undefined} Built warning
   */
  static buildWarning(
    warning,
    file,
    warningsFilter,
    sourceMap,
    requestShortener,
  ) {
    let warningMessage =
      typeof warning === "string"
        ? warning
        : `${warning.plugin ? `[${warning.plugin}] ` : ""}${
            warning.text || warning.message
          }`;
    let locationMessage = "";
    let source;

    if (sourceMap) {
      let line;
      let column;

      if (typeof warning === "string") {
        const match = warningRegex.exec(warning);

        if (match) {
          line = Number(match[1]);
          column = Number(match[2]);
        }
      } else {
        ({ line, column } = /** @type {WarningObject} */ (warning));
      }

      if (line && column) {
        const original =
          sourceMap &&
          getTraceMapping().originalPositionFor(sourceMap, {
            line,
            column,
          });

        if (
          original &&
          original.source &&
          original.source !== file &&
          requestShortener
        ) {
          ({ source } = original);

          warningMessage = `${warningMessage.replace(warningRegex, "")}`;
          locationMessage = `${requestShortener.shorten(original.source)}:${
            original.line
          }:${original.column}`;
        }
      }
    }

    if (warningsFilter && !warningsFilter(warning, file, source)) {
      return;
    }

    /**
     * @type {Error & { hideStack?: boolean, file?: string }}
     */
    const builtWarning = new Error(
      `${file} from Css Minimizer plugin\n${warningMessage}${
        locationMessage ? ` ${locationMessage}` : ""
      }`,
    );

    builtWarning.name = "Warning";
    builtWarning.hideStack = true;
    builtWarning.file = file;

    return builtWarning;
  }

  /**
   * @private
   * @param {Error | ErrorObject | string} error Error
   * @param {string} file File name
   * @param {TraceMap=} sourceMap Source map
   * @param {Compilation["requestShortener"]=} requestShortener Request shortener
   * @returns {Error} Built error
   */
  static buildError(error, file, sourceMap, requestShortener) {
    /**
     * @type {Error & { file?: string }}
     */
    let builtError;

    if (typeof error === "string") {
      builtError = new Error(`${file} from Css Minimizer plugin\n${error}`);
      builtError.file = file;

      return builtError;
    }

    if (
      /** @type {ErrorObject} */ (error).line &&
      /** @type {ErrorObject} */ (error).column
    ) {
      const { line, column } =
        /** @type {ErrorObject & { line: number, column: number }} */ (error);

      const original =
        sourceMap &&
        getTraceMapping().originalPositionFor(sourceMap, { line, column });

      if (original && original.source && requestShortener) {
        builtError = new Error(
          `${file} from Css Minimizer plugin\n${
            error.message
          } [${requestShortener.shorten(original.source)}:${original.line},${
            original.column
          }][${file}:${line},${column}]${
            error.stack
              ? `\n${error.stack.split("\n").slice(1).join("\n")}`
              : ""
          }`,
        );
        builtError.file = file;

        return builtError;
      }

      builtError = new Error(
        `${file} from Css Minimizer plugin\n${
          error.message
        } [${file}:${line},${column}]${
          error.stack ? `\n${error.stack.split("\n").slice(1).join("\n")}` : ""
        }`,
      );
      builtError.file = file;

      return builtError;
    }

    if (error.stack) {
      builtError = new Error(
        `${file} from Css Minimizer plugin\n${error.stack}`,
      );
      builtError.file = file;

      return builtError;
    }

    builtError = new Error(
      `${file} from Css Minimizer plugin\n${error.message}`,
    );
    builtError.file = file;

    return builtError;
  }

  /**
   * @private
   * @param {Parallel} parallel Parallel option
   * @returns {number} Available number of cores
   */
  static getAvailableNumberOfCores(parallel) {
    // In some cases cpus() returns undefined
    // https://github.com/nodejs/node/issues/19022

    const cpus =
      typeof os.availableParallelism === "function"
        ? { length: os.availableParallelism() }
        : os.cpus() || { length: 1 };

    return parallel === true || typeof parallel === "undefined"
      ? cpus.length - 1
      : Math.min(parallel || 0, cpus.length - 1);
  }

  /**
   * @private
   * @template T
   * @param {BasicMinimizerImplementation<T> & MinimizeFunctionHelpers} implementation Implementation
   * @returns {boolean} Whether worker threads are supported
   */
  static isSupportsWorkerThreads(implementation) {
    return typeof implementation.supportsWorkerThreads !== "undefined"
      ? implementation.supportsWorkerThreads() !== false
      : true;
  }

  /**
   * Create a lazy worker factory. Workers are initialized on first call and
   * shared across all callers within the same compilation.
   * @private
   * @param {number} availableNumberOfCores Available cores
   * @param {number=} maxTasks Maximum tasks (limits worker count, defaults to availableNumberOfCores)
   * @returns {{ getWorker: (() => MinimizerWorker<T>) | undefined, numberOfWorkers: number, end: () => Promise<void> }} Worker factory and cleanup
   */
  createWorkerFactory(availableNumberOfCores, maxTasks) {
    if (availableNumberOfCores <= 0) {
      return { getWorker: undefined, numberOfWorkers: 0, end: async () => {} };
    }

    /** @type {MinimizerWorker<T> | undefined} */
    let initializedWorker;
    const numberOfWorkers = Math.min(
      maxTasks || availableNumberOfCores,
      availableNumberOfCores,
    );

    /** @type {() => MinimizerWorker<T>} */
    const getWorker = () => {
      if (initializedWorker) {
        return initializedWorker;
      }

      const { Worker } = require("jest-worker");

      initializedWorker = /** @type {MinimizerWorker<T>} */ (
        new Worker(require.resolve("./minify"), {
          numWorkers: numberOfWorkers,
          enableWorkerThreads: Array.isArray(
            this.options.minimizer.implementation,
          )
            ? this.options.minimizer.implementation.every((item) =>
                CssMinimizerPlugin.isSupportsWorkerThreads(item),
              )
            : CssMinimizerPlugin.isSupportsWorkerThreads(
                this.options.minimizer.implementation,
              ),
        })
      );

      // https://github.com/facebook/jest/issues/8872#issuecomment-524822081
      const workerStdout = initializedWorker.getStdout();

      if (workerStdout) {
        workerStdout.on("data", (chunk) => process.stdout.write(chunk));
      }

      const workerStderr = initializedWorker.getStderr();

      if (workerStderr) {
        workerStderr.on("data", (chunk) => process.stderr.write(chunk));
      }

      return initializedWorker;
    };

    const end = async () => {
      if (initializedWorker) {
        await initializedWorker.end();
        initializedWorker = undefined;
      }
    };

    return { getWorker, numberOfWorkers, end };
  }

  /**
   * @private
   * @param {Compiler} compiler Compiler
   * @param {Compilation} compilation Compilation
   * @param {Record<string, import("webpack").sources.Source>} assets Assets
   * @param {{ availableNumberOfCores: number }} optimizeOptions Optimize options
   * @returns {Promise<void>} Promise
   */
  async optimize(compiler, compilation, assets, optimizeOptions) {
    const cache = compilation.getCache("CssMinimizerWebpackPlugin");
    let numberOfAssetsForMinify = 0;
    const assetsForMinify = await Promise.all(
      Object.keys(typeof assets === "undefined" ? compilation.assets : assets)
        .filter((name) => {
          const { info } = /** @type {Asset} */ (compilation.getAsset(name));

          if (
            // Skip double minimize assets from child compilation
            info.minimized
          ) {
            return false;
          }

          if (
            !compiler.webpack.ModuleFilenameHelpers.matchObject.bind(
              undefined,
              this.options,
            )(name)
          ) {
            return false;
          }

          return true;
        })
        .map(async (name) => {
          const { info, source } = /** @type {Asset} */ (
            compilation.getAsset(name)
          );

          const eTag = cache.getLazyHashedEtag(source);
          const cacheItem = cache.getItemCache(name, eTag);
          const output = await cacheItem.getPromise();

          if (!output) {
            numberOfAssetsForMinify += 1;
          }

          return { name, info, inputSource: source, output, cacheItem };
        }),
    );

    if (assetsForMinify.length === 0) {
      return;
    }

    const workerFactory = this.createWorkerFactory(
      optimizeOptions.availableNumberOfCores,
      numberOfAssetsForMinify,
    );
    const { getWorker, numberOfWorkers } = workerFactory;
    const scheduledTasks = [];

    for (const asset of assetsForMinify) {
      scheduledTasks.push(async () => {
        const { name, inputSource, cacheItem } = asset;
        let { output } = asset;

        if (!output) {
          const { source: input, map } = inputSource.sourceAndMap();

          output = await this.transformSource(
            compiler,
            compilation,
            name,
            input,
            map,
            getWorker,
          );

          if (output.source) {
            await cacheItem.storePromise({
              source: output.source,
              warnings: output.warnings,
              errors: output.errors,
            });
          }
        }

        for (const warning of output.warnings || []) {
          compilation.warnings.push(warning);
        }

        for (const error of output.errors || []) {
          compilation.errors.push(error);
        }

        if (!output.source) {
          return;
        }

        const newInfo = { minimized: true };
        const { source } = output;

        compilation.updateAsset(name, source, newInfo);
      });
    }

    const limit =
      getWorker && numberOfWorkers > 0
        ? numberOfWorkers
        : scheduledTasks.length;
    await throttleAll(limit, scheduledTasks);

    await workerFactory.end();
  }

  /**
   * Minify a CSS source and return the result with errors/warnings.
   * Shared by both processAssets and processContent hooks.
   * Callers are responsible for pushing returned warnings/errors to compilation.
   * @private
   * @param {Compiler} compiler Compiler
   * @param {Compilation} compilation Compilation
   * @param {string} name Asset or resource name
   * @param {string | Buffer} rawInput CSS content
   * @param {unknown} rawSourceMap Source map (validated internally)
   * @param {(() => MinimizerWorker<T>) | undefined} getWorker Worker factory
   * @returns {Promise<{ source: import("webpack").sources.Source | undefined, warnings: EXPECTED_ANY[], errors: EXPECTED_ANY[] }>} Result
   */
  async transformSource(
    compiler,
    compilation,
    name,
    rawInput,
    rawSourceMap,
    getWorker,
  ) {
    const input = Buffer.isBuffer(rawInput) ? rawInput.toString() : rawInput;
    const { SourceMapSource, RawSource } = compiler.webpack.sources;

    /** @type {RawSourceMap | undefined} */
    let inputSourceMap;

    /** @type {EXPECTED_ANY[]} */
    const earlyWarnings = [];

    if (rawSourceMap) {
      if (!CssMinimizerPlugin.isSourceMap(rawSourceMap)) {
        earlyWarnings.push(
          /** @type {WebpackError} */ (
            new Error(`${name} contains invalid source map`)
          ),
        );
      } else {
        inputSourceMap = /** @type {RawSourceMap} */ (rawSourceMap);
      }
    }

    /** @type {InternalOptions<T>} */
    const options = {
      name,
      input,
      inputSourceMap,
      minimizer: {
        implementation: this.options.minimizer.implementation,
        options: this.options.minimizer.options,
      },
    };

    /** @type {InternalResult} */
    let result;

    try {
      result = await (getWorker
        ? getWorker().transform(getSerializeJavascript()(options))
        : minify(options));
    } catch (error) {
      const hasSourceMap =
        inputSourceMap && CssMinimizerPlugin.isSourceMap(inputSourceMap);

      const builtError = CssMinimizerPlugin.buildError(
        /** @type {Error} */ (error),
        name,
        hasSourceMap
          ? new (getTraceMapping().TraceMap)(
              /** @type {RawSourceMap} */ (inputSourceMap),
            )
          : undefined,
        hasSourceMap ? compilation.requestShortener : undefined,
      );

      return {
        source: undefined,
        warnings: earlyWarnings,
        errors: [builtError],
      };
    }

    /** @type {import("webpack").sources.Source | undefined} */
    let source;

    for (const item of result.outputs) {
      if (item.map) {
        let originalSource;
        let innerSourceMap;

        if (source) {
          ({ source: originalSource, map: innerSourceMap } =
            source.sourceAndMap());
        } else {
          originalSource = input;
          innerSourceMap = inputSourceMap;
        }

        // TODO need API for merging source maps in `webpack-source`
        source = new SourceMapSource(
          item.code,
          name,
          item.map,
          originalSource,
          innerSourceMap,
          true,
        );
      } else if (typeof item.code !== "undefined" && item.code !== null) {
        source = new RawSource(item.code);
      }
    }

    /** @type {EXPECTED_ANY[]} */
    const errors = [];
    /** @type {EXPECTED_ANY[]} */
    const warnings = [];

    if (result.errors && result.errors.length > 0) {
      const hasSourceMap =
        inputSourceMap && CssMinimizerPlugin.isSourceMap(inputSourceMap);

      for (const error of result.errors) {
        errors.push(
          CssMinimizerPlugin.buildError(
            error,
            name,
            hasSourceMap
              ? new (getTraceMapping().TraceMap)(
                  /** @type {RawSourceMap} */ (inputSourceMap),
                )
              : undefined,
            hasSourceMap ? compilation.requestShortener : undefined,
          ),
        );
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      const hasSourceMap =
        inputSourceMap && CssMinimizerPlugin.isSourceMap(inputSourceMap);

      for (const warning of result.warnings) {
        const buildWarning = CssMinimizerPlugin.buildWarning(
          warning,
          name,
          this.options.warningsFilter,
          hasSourceMap
            ? new (getTraceMapping().TraceMap)(
                /** @type {RawSourceMap} */ (inputSourceMap),
              )
            : undefined,
          hasSourceMap ? compilation.requestShortener : undefined,
        );

        if (buildWarning) {
          warnings.push(buildWarning);
        }
      }
    }

    return { source, warnings: [...earlyWarnings, ...warnings], errors };
  }

  /**
   * @param {Compiler} compiler Compiler
   * @returns {void} Void
   */
  apply(compiler) {
    const pluginName = this.constructor.name;
    const availableNumberOfCores = CssMinimizerPlugin.getAvailableNumberOfCores(
      this.options.parallel,
    );

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // Process CSS content embedded in JS modules (text/style/css-style-sheet export types)
      // processContent runs during code generation, which happens before processAssets,
      // so the worker is cleaned up in the processAssets handler below.
      /** @type {ReturnType<typeof this.createWorkerFactory> | undefined} */
      let contentWorkerFactory;

      if (compilation.hooks.processContent) {
        compilation.hooks.processContent.tapPromise(
          pluginName,
          async (source, name) => {
            if (
              !compiler.webpack.ModuleFilenameHelpers.matchObject.bind(
                undefined,
                this.options,
              )(name)
            ) {
              return source;
            }

            const [content, sourceMap] = source;

            if (!contentWorkerFactory) {
              contentWorkerFactory = this.createWorkerFactory(
                availableNumberOfCores,
              );
            }

            const output = await this.transformSource(
              compiler,
              compilation,
              name,
              content,
              sourceMap,
              contentWorkerFactory.getWorker,
            );

            for (const warning of output.warnings) {
              compilation.warnings.push(warning);
            }

            for (const error of output.errors) {
              compilation.errors.push(error);
            }

            if (output.source) {
              const { source: code, map } = output.source.sourceAndMap();
              return [/** @type {string} */ (code), map || undefined];
            }

            return source;
          },
        );
      }

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage:
            compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        async (assets) => {
          // Clean up processContent workers before processing assets
          if (contentWorkerFactory) {
            await contentWorkerFactory.end();
            contentWorkerFactory = undefined;
          }

          await this.optimize(compiler, compilation, assets, {
            availableNumberOfCores,
          });
        },
      );

      compilation.hooks.statsPrinter.tap(pluginName, (stats) => {
        stats.hooks.print
          .for("asset.info.minimized")
          .tap(
            "css-minimizer-webpack-plugin",
            (minimized, { green, formatFlag }) =>
              minimized
                ? /** @type {(text: string) => string} */ (green)(
                    /** @type {(flag: string) => string} */ (formatFlag)(
                      "minimized",
                    ),
                  )
                : "",
          );
      });
    });
  }
}

CssMinimizerPlugin.cssnanoMinify = cssnanoMinify;
CssMinimizerPlugin.cssoMinify = cssoMinify;
CssMinimizerPlugin.cleanCssMinify = cleanCssMinify;
CssMinimizerPlugin.esbuildMinify = esbuildMinify;
CssMinimizerPlugin.parcelCssMinify = parcelCssMinify;
CssMinimizerPlugin.lightningCssMinify = lightningCssMinify;
CssMinimizerPlugin.swcMinify = swcMinify;

module.exports = CssMinimizerPlugin;
