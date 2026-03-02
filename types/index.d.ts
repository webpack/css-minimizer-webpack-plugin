export = CssMinimizerPlugin;
/**
 * @template [T=CssNanoOptionsExtended]
 */
declare class CssMinimizerPlugin<T = CssNanoOptionsExtended> {
  /**
   * @private
   * @param {unknown} input Input to check
   * @returns {boolean} Whether input is a source map
   */
  private static isSourceMap;
  /**
   * @private
   * @param {Warning | WarningObject | string} warning Warning
   * @param {string} file File name
   * @param {WarningsFilter=} warningsFilter Warnings filter
   * @param {TraceMap=} sourceMap Source map
   * @param {Compilation["requestShortener"]=} requestShortener Request shortener
   * @returns {Error & { hideStack?: boolean, file?: string } | undefined} Built warning
   */
  private static buildWarning;
  /**
   * @private
   * @param {Error | ErrorObject | string} error Error
   * @param {string} file File name
   * @param {TraceMap=} sourceMap Source map
   * @param {Compilation["requestShortener"]=} requestShortener Request shortener
   * @returns {Error} Built error
   */
  private static buildError;
  /**
   * @private
   * @param {Parallel} parallel Parallel option
   * @returns {number} Available number of cores
   */
  private static getAvailableNumberOfCores;
  /**
   * @private
   * @template T
   * @param {BasicMinimizerImplementation<T> & MinimizeFunctionHelpers} implementation Implementation
   * @returns {boolean} Whether worker threads are supported
   */
  private static isSupportsWorkerThreads;
  /**
   * @param {BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>=} options Plugin options
   */
  constructor(
    options?:
      | (BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>)
      | undefined,
  );
  /**
   * @private
   * @type {InternalPluginOptions<T>}
   */
  private options;
  /**
   * @private
   * @param {Compiler} compiler Compiler
   * @param {Compilation} compilation Compilation
   * @param {Record<string, import("webpack").sources.Source>} assets Assets
   * @param {{ availableNumberOfCores: number }} optimizeOptions Optimize options
   * @returns {Promise<void>} Promise
   */
  private optimize;
  /**
   * @param {Compiler} compiler Compiler
   * @returns {void} Void
   */
  apply(compiler: Compiler): void;
}
declare namespace CssMinimizerPlugin {
  export {
    cssnanoMinify,
    cssoMinify,
    cleanCssMinify,
    esbuildMinify,
    parcelCssMinify,
    lightningCssMinify,
    swcMinify,
    Schema,
    Compiler,
    Compilation,
    WebpackError,
    JestWorker,
    RawSourceMap,
    Asset,
    ProcessOptions,
    Syntax,
    Parser,
    Stringifier,
    TraceMap,
    EXPECTED_ANY,
    CssNanoOptions,
    Warning,
    WarningObject,
    ErrorObject,
    MinimizedResult,
    Input,
    CustomOptions,
    InferDefaultType,
    MinimizerOptions,
    BasicMinimizerImplementation,
    MinimizeFunctionHelpers,
    MinimizerImplementation,
    InternalOptions,
    InternalResult,
    Parallel,
    Rule,
    Rules,
    WarningsFilter,
    BasePluginOptions,
    MinimizerWorker,
    ProcessOptionsExtender,
    CssNanoOptionsExtended,
    DefinedDefaultMinimizerAndOptions,
    InternalPluginOptions,
  };
}
import { cssnanoMinify } from "./utils";
import { cssoMinify } from "./utils";
import { cleanCssMinify } from "./utils";
import { esbuildMinify } from "./utils";
import { parcelCssMinify } from "./utils";
import { lightningCssMinify } from "./utils";
import { swcMinify } from "./utils";
type Schema = import("schema-utils/declarations/validate").Schema;
type Compiler = import("webpack").Compiler;
type Compilation = import("webpack").Compilation;
type WebpackError = import("webpack").WebpackError;
type JestWorker = import("jest-worker").Worker;
type RawSourceMap = import("@jridgewell/trace-mapping").EncodedSourceMap & {
  sources: string[];
  sourcesContent?: string[];
  file: string;
};
type Asset = import("webpack").Asset;
type ProcessOptions = import("postcss").ProcessOptions;
type Syntax = import("postcss").Syntax;
type Parser = import("postcss").Parser;
type Stringifier = import("postcss").Stringifier;
type TraceMap = import("@jridgewell/trace-mapping").TraceMap;
type EXPECTED_ANY = any;
type CssNanoOptions = Record<string, unknown>;
type Warning =
  | (Error & {
      plugin?: string;
      text?: string;
      source?: string;
    })
  | string;
type WarningObject = {
  /**
   * Warning message
   */
  message: string;
  /**
   * Plugin name
   */
  plugin?: string | undefined;
  /**
   * Warning text
   */
  text?: string | undefined;
  /**
   * Line number
   */
  line?: number | undefined;
  /**
   * Column number
   */
  column?: number | undefined;
};
type ErrorObject = {
  /**
   * Error message
   */
  message: string;
  /**
   * Line number
   */
  line?: number | undefined;
  /**
   * Column number
   */
  column?: number | undefined;
  /**
   * Error stack trace
   */
  stack?: string | undefined;
};
type MinimizedResult = {
  /**
   * Minimized code
   */
  code: string;
  /**
   * Source map
   */
  map?: RawSourceMap | undefined;
  /**
   * Errors
   */
  errors?: (Error | ErrorObject | string)[] | undefined;
  /**
   * Warnings
   */
  warnings?: (Warning | WarningObject | string)[] | undefined;
};
type Input = {
  [file: string]: string;
};
type CustomOptions = {
  [key: string]: unknown;
};
type InferDefaultType<T> = T extends infer U ? U : CustomOptions;
type MinimizerOptions<T> = T extends EXPECTED_ANY[]
  ? { [P in keyof T]?: InferDefaultType<T[P]> }
  : InferDefaultType<T>;
type BasicMinimizerImplementation<T> = (
  input: Input,
  sourceMap: RawSourceMap | undefined,
  minifyOptions: InferDefaultType<T>,
) => Promise<MinimizedResult> | MinimizedResult;
type MinimizeFunctionHelpers = {
  /**
   * Check if worker threads are supported
   */
  supportsWorkerThreads?: (() => boolean | undefined) | undefined;
};
type MinimizerImplementation<T> = T extends EXPECTED_ANY[]
  ? {
      [P in keyof T]: BasicMinimizerImplementation<T[P]> &
        MinimizeFunctionHelpers;
    }
  : BasicMinimizerImplementation<T> & MinimizeFunctionHelpers;
type InternalOptions<T> = {
  /**
   * Name
   */
  name: string;
  /**
   * Input
   */
  input: string;
  /**
   * Input source map
   */
  inputSourceMap: RawSourceMap | undefined;
  /**
   * Minimizer
   */
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
type InternalResult = {
  /**
   * - Outputs
   */
  outputs: {
    code: string;
    map: RawSourceMap | undefined;
  }[];
  /**
   * - Warnings
   */
  warnings: (Warning | WarningObject | string)[];
  /**
   * - Errors
   */
  errors: (Error | ErrorObject | string)[];
};
type Parallel = undefined | boolean | number;
type Rule = RegExp | string;
type Rules = Rule[] | Rule;
type WarningsFilter = (
  warning: Warning | WarningObject | string,
  file: string,
  source?: string,
) => boolean;
type BasePluginOptions = {
  /**
   * Test rule
   */
  test?: Rule | undefined;
  /**
   * Include rule
   */
  include?: Rule | undefined;
  /**
   * Exclude rule
   */
  exclude?: Rule | undefined;
  /**
   * Warnings filter
   */
  warningsFilter?: WarningsFilter | undefined;
  /**
   * Parallel option
   */
  parallel?: Parallel | undefined;
};
type MinimizerWorker<T> = JestWorker & {
  transform: (options: string) => Promise<InternalResult>;
  minify: (options: InternalOptions<T>) => Promise<InternalResult>;
};
type ProcessOptionsExtender =
  | ProcessOptions
  | {
      from?: string;
      to?: string;
      parser?: string | Syntax | Parser;
      stringifier?: string | Syntax | Stringifier;
      syntax?: string | Syntax;
    };
type CssNanoOptionsExtended = CssNanoOptions & {
  processorOptions?: ProcessOptionsExtender;
};
type DefinedDefaultMinimizerAndOptions<T> = T extends CssNanoOptionsExtended
  ? {
      minify?: MinimizerImplementation<T> | undefined;
      minimizerOptions?: MinimizerOptions<T> | undefined;
    }
  : {
      minify: MinimizerImplementation<T>;
      minimizerOptions?: MinimizerOptions<T> | undefined;
    };
type InternalPluginOptions<T> = BasePluginOptions & {
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
