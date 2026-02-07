import { $typst } from "@myriaddreamin/typst.ts";

const encoder = new TextEncoder();
let initialized = false;

/**
 * 1. Initialization Logic
 */
const initPromise = (async () => {
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
async function compile(vfs, mainFile) {
  await initPromise;
  if (!initialized) {
    self.postMessage({ type: "error", error: "Compiler not initialized" });
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
      const uint8Content =
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
      mainFilePath: mainFilePath,
    });

    if (vectorData && vectorData.length > 0) {
      // Don't transfer the buffer to avoid aliasing issues
      self.postMessage({ type: "render", vectorData });
    } else {
      self.postMessage({
        type: "error",
        error: "Compilation produced no output",
      });
    }
  } catch (err) {
    console.error("Worker: Compile Error", err);
    self.postMessage({ type: "error", error: err.message || String(err) });
  }
}

/**
 * 3. Message Listener
 */
self.onmessage = async (e) => {
  const { type, data } = e.data;
  if ((type === "SYNC_VFS" || type === "UPDATE_FILE") && data) {
    const { files, mainFilePath } = data;
    await compile(files, mainFilePath);
  }
};
