/** @typedef {import("./index.js").Input} Input */
/** @typedef {import("./index.js").RawSourceMap} RawSourceMap */
/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").CustomOptions} CustomOptions */
/** @typedef {import("postcss").ProcessOptions} ProcessOptions */
/** @typedef {import("postcss").Postcss} Postcss */

const notSettled = Symbol("not-settled");

/**
 * @template T
 * @typedef {() => Promise<T>} Task
 */

/**
 * Run tasks with limited concurrency.
 * @template T
 * @param {number} limit Limit of tasks that run at once.
 * @param {Task<T>[]} tasks List of tasks to run.
 * @returns {Promise<T[]>} A promise that fulfills to an array of the results
 */
function throttleAll(limit, tasks) {
  return new Promise((resolve, reject) => {
    const result = Array.from({ length: tasks.length }).fill(notSettled);
    const entries = tasks.entries();
    const next = () => {
      const { done, value } = entries.next();

      if (done) {
        const isLast = !result.includes(notSettled);

        if (isLast) resolve(result);

        return;
      }

      const [index, task] = value;

      /**
       * @param {T} resultValue Result value
       */
      const onFulfilled = (resultValue) => {
        result[index] = resultValue;
        next();
      };

      task().then(onFulfilled, reject);
    };

    for (let i = 0; i < limit; i++) {
      next();
    }
  });
}

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function cssnanoMinify(
  input,
  sourceMap,
  minimizerOptions = { preset: "default" },
) {
  /**
   * @template T
   * @param {string} module Module to load
   * @returns {Promise<T>} Promise with loaded module
   */
  const load = async (module) => {
    let exports;

    try {
      exports = require(module);

      return exports;
    } catch (err) {
      let importESM;

      try {
        // eslint-disable-next-line no-new-func
        importESM = new Function("id", "return import(id);");
      } catch {
        importESM = null;
      }

      if (
        /** @type {Error & {code: string}} */
        (err).code === "ERR_REQUIRE_ESM" &&
        importESM
      ) {
        exports = await importESM(module);

        return exports.default;
      }

      throw err;
    }
  };

  const [[name, code]] = Object.entries(input);
  /** @type {ProcessOptions} */
  const postcssOptions = {
    from: name,
    ...(minimizerOptions.processorOptions &&
    typeof minimizerOptions.processorOptions === "object"
      ? minimizerOptions.processorOptions
      : {}),
  };

  if (typeof postcssOptions.parser === "string") {
    try {
      postcssOptions.parser = await load(postcssOptions.parser);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.parser}" parser failed: ${
          /** @type {Error} */ (error).message
        }\n\n(@${name})`,
      );
    }
  }

  if (typeof postcssOptions.stringifier === "string") {
    try {
      postcssOptions.stringifier = await load(postcssOptions.stringifier);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.stringifier}" stringifier failed: ${
          /** @type {Error} */ (error).message
        }\n\n(@${name})`,
      );
    }
  }

  if (typeof postcssOptions.syntax === "string") {
    try {
      postcssOptions.syntax = await load(postcssOptions.syntax);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.syntax}" syntax failed: ${
          /** @type {Error} */ (error).message
        }\n\n(@${name})`,
      );
    }
  }

  if (sourceMap) {
    postcssOptions.map = { annotation: false };
  }

  /** @type {Postcss} */

  const postcss = require("postcss").default;

  const cssnano = require("cssnano");

  // Types are broken
  const result = await postcss([cssnano(minimizerOptions)]).process(
    code,
    postcssOptions,
  );

  return {
    code: result.css,
    map: result.map
      ? /** @type {RawSourceMap} */ (
          /** @type {unknown} */ (result.map.toJSON())
        )
      : undefined,
    warnings: result.warnings().map(String),
  };
}

cssnanoMinify.supportsWorkerThreads = () => true;

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function cssoMinify(input, sourceMap, minimizerOptions) {
  const csso = require("csso");

  const [[filename, code]] = Object.entries(input);
  const result = csso.minify(code, {
    filename,
    sourceMap: Boolean(sourceMap),
    ...minimizerOptions,
  });

  return {
    code: result.css,
    map: result.map
      ? /** @type {RawSourceMap} */ (
          /** @type {{ toJSON(): RawSourceMap }} */ (result.map).toJSON()
        )
      : undefined,
  };
}

cssoMinify.supportsWorkerThreads = () => true;

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function cleanCssMinify(input, sourceMap, minimizerOptions) {
  const CleanCSS = require("clean-css");

  const [[name, code]] = Object.entries(input);
  const result = await new CleanCSS({
    sourceMap: Boolean(sourceMap),
    ...minimizerOptions,
    returnPromise: true,
  }).minify({ [name]: { styles: code } });

  const generatedSourceMap = result.sourceMap
    ? /** @type {RawSourceMap} */ (
        // eslint-disable-next-line jsdoc/no-restricted-syntax
        /** @type {any} */ (result.sourceMap).toJSON()
      )
    : undefined;

  // workaround for source maps on windows
  if (generatedSourceMap) {
    const isWindowsPathSep = require("node:path").sep === "\\";

    generatedSourceMap.sources = generatedSourceMap.sources.map(
      /**
       * @param {string | null} item Path item
       * @returns {string} Normalized path
       */
      (item) =>
        isWindowsPathSep ? (item || "").replaceAll("\\", "/") : item || "",
    );
  }

  return {
    code: result.styles,
    map: generatedSourceMap,
    warnings: result.warnings,
  };
}

cleanCssMinify.supportsWorkerThreads = () => true;

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function esbuildMinify(input, sourceMap, minimizerOptions) {
  /**
   * @param {import("esbuild").TransformOptions=} esbuildOptions ESBuild options
   * @returns {import("esbuild").TransformOptions} Built ESBuild options
   */
  const buildEsbuildOptions = (esbuildOptions = {}) =>
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    ({
      loader: "css",
      minify: true,
      legalComments: "inline",
      ...esbuildOptions,
      sourcemap: false,
    });

  const esbuild = require("esbuild");

  // Copy `esbuild` options
  const esbuildOptions = buildEsbuildOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    esbuildOptions.sourcemap = true;
    esbuildOptions.sourcesContent = false;
  }

  const [[filename, code]] = Object.entries(input);

  esbuildOptions.sourcefile = filename;

  const result = await esbuild.transform(code, esbuildOptions);

  return {
    code: result.code,

    map: result.map ? JSON.parse(result.map) : undefined,
    warnings:
      result.warnings.length > 0
        ? result.warnings.map((item) => ({
            source: item.location && item.location.file,
            line:
              item.location && item.location.line
                ? item.location.line
                : undefined,
            column:
              item.location && item.location.column
                ? item.location.column
                : undefined,
            plugin: item.pluginName,
            message: `${item.text}${
              item.detail ? `\nDetails:\n${item.detail}` : ""
            }${
              item.notes.length > 0
                ? `\n\nNotes:\n${item.notes
                    .map(
                      (note) =>
                        `${
                          note.location
                            ? `[${note.location.file}:${note.location.line}:${note.location.column}] `
                            : ""
                        }${note.text}${
                          note.location
                            ? `\nSuggestion: ${note.location.suggestion}`
                            : ""
                        }${
                          note.location
                            ? `\nLine text:\n${note.location.lineText}\n`
                            : ""
                        }`,
                    )
                    .join("\n")}`
                : ""
            }`,
          }))
        : [],
  };
}

esbuildMinify.supportsWorkerThreads = () => false;

// TODO remove in the next major release
/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function parcelCssMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /**
   * @param {Partial<import("@parcel/css").TransformOptions<any>>=} parcelCssOptions Parcel CSS options
   * @returns {import("@parcel/css").TransformOptions<any>} Built Parcel CSS options
   */
  const buildParcelCssOptions = (parcelCssOptions = {}) =>
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    ({
      minify: true,
      ...parcelCssOptions,
      sourceMap: false,
      filename,
      code: new Uint8Array(Buffer.from(code)),
    });

  const parcelCss = require("@parcel/css");

  // Copy `parcel-css` options
  const parcelCssOptions = buildParcelCssOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    parcelCssOptions.sourceMap = true;
  }

  const result = await parcelCss.transform(parcelCssOptions);

  return {
    code: result.code.toString(),

    map: result.map ? JSON.parse(result.map.toString()) : undefined,
  };
}

parcelCssMinify.supportsWorkerThreads = () => false;

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function lightningCssMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  // eslint-disable-next-line jsdoc/no-restricted-syntax
  /**
   * @param {Partial<import("lightningcss").TransformOptions<any>>=} lightningCssOptions Lightning CSS options
   * @returns {import("lightningcss").TransformOptions<any>} Built Lightning CSS options
   */
  const buildLightningCssOptions = (lightningCssOptions = {}) =>
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    ({
      minify: true,
      ...lightningCssOptions,
      sourceMap: false,
      filename,
      code: new Uint8Array(Buffer.from(code)),
    });

  const lightningCss = require("lightningcss");

  // Copy `lightningCss` options
  const lightningCssOptions = buildLightningCssOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    lightningCssOptions.sourceMap = true;
  }

  const result = await lightningCss.transform(lightningCssOptions);

  return {
    code: result.code.toString(),

    map: result.map ? JSON.parse(result.map.toString()) : undefined,
  };
}

lightningCssMinify.supportsWorkerThreads = () => false;

/* istanbul ignore next */
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
async function swcMinify(input, sourceMap, minimizerOptions) {
  const [[filename, code]] = Object.entries(input);
  /**
   * @param {Partial<import("@swc/css").MinifyOptions>=} swcOptions SWC options
   * @returns {import("@swc/css").MinifyOptions} Built SWC options
   */
  const buildSwcOptions = (swcOptions = {}) =>
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    ({
      ...swcOptions,
      filename,
    });

  const swc = require("@swc/css");

  // Copy `swc` options
  const swcOptions = buildSwcOptions(minimizerOptions);

  // Let `swc` generate a SourceMap
  if (sourceMap) {
    swcOptions.sourceMap = true;
  }

  const result = await swc.minify(Buffer.from(code), swcOptions);

  return {
    code: result.code.toString(),

    map: result.map ? JSON.parse(result.map.toString()) : undefined,
    errors: result.errors
      ? result.errors.map((diagnostic) => {
          const error = new Error(diagnostic.message);

          // eslint-disable-next-line jsdoc/no-restricted-syntax
          /** @type {any} */ (error).span = diagnostic.span;

          // eslint-disable-next-line jsdoc/no-restricted-syntax
          /** @type {any} */ (error).level = diagnostic.level;

          return error;
        })
      : undefined,
  };
}

swcMinify.supportsWorkerThreads = () => false;

/**
 * @template T
 * @param {(() => unknown) | undefined} fn Function to memoize
 * @returns {() => T} Memoized function
 */
function memoize(fn) {
  let cache = false;
  /** @type {T} */
  let result;

  return () => {
    if (cache) {
      return result;
    }
    result = /** @type {T} */ (/** @type {() => unknown} */ (fn)());
    cache = true;
    // Allow to clean up memory for fn
    // and all dependent resources

    fn = undefined;

    return result;
  };
}

module.exports = {
  cleanCssMinify,
  cssnanoMinify,
  cssoMinify,
  esbuildMinify,
  lightningCssMinify,
  memoize,
  parcelCssMinify,
  swcMinify,
  throttleAll,
};
