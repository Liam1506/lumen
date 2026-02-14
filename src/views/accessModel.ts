import type { FetchAccessOptions } from "@myriaddreamin/typst.ts";
import type { FsAccessModel } from "@myriaddreamin/typst.ts/dist/esm/internal.types.mjs";

export class InMemoryAccessModel implements FsAccessModel {
  public mTimes: Map<string, Date | undefined> = new Map();
  public mData: Map<string, Uint8Array | undefined> = new Map();
  constructor(private root: string, options?: FetchAccessOptions) {
    if (root.endsWith('/')) {
      this.root = this.root.slice(0, this.root.length - 1);
    }
  }

  addFile(path: string, data: Uint8Array, mtime?: Date) {
    this.mTimes.set(path, mtime);
    this.mData.set(path, data);
  }

  addSourceFile(path: string, data: string, mtime?: Date) {
    const encoder = new TextEncoder();
    this.addFile(path, encoder.encode(data), mtime);
  }

  reset() {
    this.mTimes.clear();
    this.mData.clear();
  }

  resolvePath(path: string): string {
    return this.root + path;
  }

  getMTime(path: string): Date | undefined {
    if (this.mTimes.has(path)) {
      return this.mTimes.get(path);
    }
    throw new Error(`no such file ${path}`);
  }

  isFile(): boolean | undefined {
    return true;
  }

  getRealPath(path: string): string | undefined {
    return path;
  }


  readAll(path: string): Uint8Array | undefined {
    if (this.mData.has(path)) {
      return this.mData.get(path);
    }
    throw new Error(`no such file ${path}`);
  }
}
