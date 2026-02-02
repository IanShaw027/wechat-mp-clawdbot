/**
 * 统一的存储工具模块
 * 提供文件系统操作的抽象层，避免重复的文件操作代码
 */
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 获取数据存储目录路径
 * 可通过环境变量 WEMP_DATA_DIR 自定义
 */
export function getDataDir(): string {
  return process.env.WEMP_DATA_DIR || path.join(process.env.HOME || "/tmp", ".openclaw", "data", "wemp");
}

/**
 * 确保目录存在，如果不存在则创建
 * @param dirPath 目录路径
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 读取 JSON 文件
 * @param filePath 文件路径
 * @param defaultValue 文件不存在或读取失败时返回的默认值
 * @returns 解析后的 JSON 数据或默认值
 */
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[wemp:storage] 读取 JSON 文件失败 (${filePath}):`, error);
    return defaultValue;
  }
}

/**
 * 写入 JSON 文件（原子写入）
 * 使用临时文件 + rename 确保写入的原子性
 * @param filePath 文件路径
 * @param data 要写入的数据
 */
export function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, filePath);
  } finally {
    try {
      if (fs.existsSync(tmp)) {
        fs.unlinkSync(tmp);
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * JSON 存储类
 * 提供带缓存的 JSON 文件存储，支持原子写入
 */
export class JsonStore<T> {
  private cache: T | null = null;

  constructor(
    private readonly filePath: string,
    private readonly defaultValue: T
  ) {}

  /**
   * 读取数据（带缓存）
   */
  read(): T {
    if (this.cache !== null) {
      return this.cache;
    }
    this.cache = readJsonFile(this.filePath, this.defaultValue);
    return this.cache;
  }

  /**
   * 写入数据（更新缓存并持久化）
   */
  write(data: T): void {
    this.cache = data;
    writeJsonFile(this.filePath, data);
  }

  /**
   * 清除缓存（下次读取时重新从磁盘加载）
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * 更新数据（使用回调函数）
   */
  update(updater: (current: T) => T): void {
    const current = this.read();
    const updated = updater(current);
    this.write(updated);
  }
}
