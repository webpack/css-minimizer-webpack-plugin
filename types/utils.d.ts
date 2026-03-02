export type Task<T> = () => Promise<T>;
export type Input = import("./index.js").Input;
export type RawSourceMap = import("./index.js").RawSourceMap;
export type MinimizedResult = import("./index.js").MinimizedResult;
export type CustomOptions = import("./index.js").CustomOptions;
export type EXPECTED_ANY = import("./index.js").EXPECTED_ANY;
export type ProcessOptions = import("postcss").ProcessOptions;
export type Postcss = import("postcss").Postcss;
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function cleanCssMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace cleanCssMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function cssnanoMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace cssnanoMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function cssoMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace cssoMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function esbuildMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace esbuildMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function lightningCssMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace lightningCssMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @template T
 * @param {(() => unknown) | undefined} fn Function to memoize
 * @returns {() => T} Memoized function
 */
export function memoize<T>(fn: (() => unknown) | undefined): () => T;
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function parcelCssMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace parcelCssMinify {
  function supportsWorkerThreads(): boolean;
}
/**
 * @param {Input} input Input
 * @param {RawSourceMap=} sourceMap Source map
 * @param {CustomOptions=} minimizerOptions Minimizer options
 * @returns {Promise<MinimizedResult>} Promise with minimized result
 */
export function swcMinify(
  input: Input,
  sourceMap?: RawSourceMap | undefined,
  minimizerOptions?: CustomOptions | undefined,
): Promise<MinimizedResult>;
export namespace swcMinify {
  function supportsWorkerThreads(): boolean;
}
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
export function throttleAll<T>(limit: number, tasks: Task<T>[]): Promise<T[]>;
