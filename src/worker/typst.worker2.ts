import { COMPILER_WASM_URL } from "@/connstats";
import { createTypstCompiler, loadFonts } from "@myriaddreamin/typst.ts";

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
  artifact: Uint8Array<ArrayBufferLike>;
}

interface ErrorMessage {
  type: "error";
  error: string;
}

/**
 * 1. Initialization Logic
 */

const cc = createTypstCompiler();
const initPromise: Promise<void> = (async () => {
  console.log("Worker: Starting initialization...");
  try {
    await cc.init({
      getModule: () => COMPILER_WASM_URL,
      beforeBuild: [
        // Load Roboto font - ensure this completes before compilation
        loadFonts([
          'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2'
        ]),
      ]
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

    // Clear previous sources to avoid stale data
    cc.resetShadow();

    // Map each file individually to the shadow filesystem
    for (const [path, content] of Object.entries(vfs)) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      
      // Convert content to string if needed
      const contentStr = typeof content === 'string' 
        ? content 
        : content instanceof Uint8Array 
          ? new TextDecoder().decode(content)
          : new TextDecoder().decode(new Uint8Array(content));

      cc.addSource(normalizedPath, contentStr);
    }

    // Compile with the main file path
    const mainFilePath = mainFile.startsWith("/") ? mainFile : `/${mainFile}`;

    const artifact = await cc.compile({ mainFilePath });

    if (artifact.result) {
      // Ensure we're sending a proper Uint8Array
      const resultArray = new Uint8Array(artifact.result);
      
      self.postMessage({
        type: "render",
        artifact: resultArray,
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