/**
 * 统一的 Result 类型模式
 * 用于标准化错误处理，避免混用异常、null 和不同的返回格式
 */

/**
 * Result 类型：表示可能成功或失败的操作结果
 * @template T 成功时的数据类型
 * @template E 失败时的错误类型（默认为 string）
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 创建成功的 Result
 * @param data 成功时返回的数据
 * @returns 成功的 Result 对象
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * 创建失败的 Result
 * @param error 错误信息
 * @returns 失败的 Result 对象
 */
export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 类型守卫：检查 Result 是否成功
 * @param result 要检查的 Result
 * @returns 如果成功返回 true，并将类型收窄为成功类型
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * 类型守卫：检查 Result 是否失败
 * @param result 要检查的 Result
 * @returns 如果失败返回 true，并将类型收窄为失败类型
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * 从 Result 中提取数据，如果失败则抛出异常
 * @param result Result 对象
 * @returns 成功时的数据
 * @throws 失败时抛出包含错误信息的 Error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(String(result.error));
}

/**
 * 从 Result 中提取数据，如果失败则返回默认值
 * @param result Result 对象
 * @param defaultValue 失败时返回的默认值
 * @returns 成功时的数据或默认值
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

/**
 * 将可能抛出异常的函数包装为返回 Result 的函数
 * @param fn 可能抛出异常的函数
 * @returns 返回 Result 的函数
 */
export function tryCatch<T, Args extends unknown[]>(
  fn: (...args: Args) => T
): (...args: Args) => Result<T, string> {
  return (...args: Args) => {
    try {
      return ok(fn(...args));
    } catch (error) {
      return err(error instanceof Error ? error.message : String(error));
    }
  };
}

/**
 * 将可能抛出异常的异步函数包装为返回 Result 的异步函数
 * @param fn 可能抛出异常的异步函数
 * @returns 返回 Result 的异步函数
 */
export function tryCatchAsync<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<Result<T, string>> {
  return async (...args: Args) => {
    try {
      return ok(await fn(...args));
    } catch (error) {
      return err(error instanceof Error ? error.message : String(error));
    }
  };
}

/**
 * 映射 Result 的成功值
 * @param result Result 对象
 * @param fn 映射函数
 * @returns 映射后的 Result
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.data)) : result;
}

/**
 * 映射 Result 的错误值
 * @param result Result 对象
 * @param fn 映射函数
 * @returns 映射后的 Result
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * 链式调用：如果成功则执行下一个返回 Result 的函数
 * @param result Result 对象
 * @param fn 下一个函数
 * @returns 新的 Result
 */
export function andThen<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> {
  return isOk(result) ? fn(result.data) : result;
}
