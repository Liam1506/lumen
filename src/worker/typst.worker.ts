import { $typst } from "@myriaddreamin/typst.ts";

const encoder = new TextEncoder();
let initialized = false;

/**
 * VFS type: path -> content
 */
type VfsContent = string | Uint8Array | ArrayBuffer;
type VfsMap = Record<string, VfsContent>;

/**
 * Worker message types
 */
interface CompileMessage {
  type: "SYNC_VFS" | "UPDATE_FILE";
  data: {
    files: VfsMap;
    mainFilePath: string;
  };
}

interface RenderMessage {
  type: "render";
  vectorData: Uint8Array;
}

interface ErrorMessage {
  type: "error";
  error: string;
}

/**
 * 1. Initialization Logic
 */
const initPromise: Promise<void> = (async () => {
  console.log("Worker: Starting initialization...");
  try {
    await $typst.setCompilerInitOptions({
      getModule: () => "/wasm/typst_ts_web_compiler_bg.wasm",
    });
    initialized = true;
    console.log("Worker: Typst Compiler Ready");
  } catch (err) {
    console.error("Worker: Initialization failed", err);
    throw err;
  }
})();

/**
 * 2. The Core Compile Function with proper VFS mapping
 */
async function compile(vfs: VfsMap, mainFile: string): Promise<void> {
  await initPromise;

  if (!initialized) {
    self.postMessage({
      type: "error",
      error: "Compiler not initialized",
    } satisfies ErrorMessage);
    return;
  }

  try {
    const mainContent = vfs[mainFile];
    if (!mainContent) {
      throw new Error(`Main file ${mainFile} not found`);
    }

    // Map each file individually to the shadow filesystem
    for (const [path, content] of Object.entries(vfs)) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      const uint8Content: Uint8Array =
        typeof content === "string"
          ? encoder.encode(content)
          : content instanceof Uint8Array
            ? content
            : new Uint8Array(content);

      await $typst.mapShadow(normalizedPath, uint8Content);
    }

    // Compile with the main file path
    const mainFilePath = mainFile.startsWith("/") ? mainFile : `/${mainFile}`;

    const vectorData = await $typst.vector({
      mainFilePath,
    });

    if (vectorData && vectorData.length > 0) {
      self.postMessage({
        type: "render",
        vectorData,
      } satisfies RenderMessage);
    } else {
      self.postMessage({
        type: "error",
        error: "Compilation produced no output",
      } satisfies ErrorMessage);
    }
  } catch (err: unknown) {
    console.error("Worker: Compile Error", err);
    self.postMessage({
      type: "error",
      error: err instanceof Error ? err.message : "Unknown compilation error",
    } satisfies ErrorMessage);
  }
}

/**
 * 3. Message Listener
 */
self.onmessage = async (e: MessageEvent<CompileMessage>) => {
  const { type, data } = e.data;

  if ((type === "SYNC_VFS" || type === "UPDATE_FILE") && data) {
    const { files, mainFilePath } = data;
    await compile(files, mainFilePath);
  }
};
