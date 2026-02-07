// src/typst.worker.ts (improved version)
import { $typst } from "@myriaddreamin/typst.ts";

$typst.setCompilerInitOptions({
  getModule: () => "/wasm/typst_ts_web_compiler_bg.wasm",
});

$typst.setRendererInitOptions({
  getModule: () => "/wasm/typst_ts_renderer_bg.wasm",
});

let pendingContent: string | null = null;
let isCompiling = false;
let isInitialized = false;

// Pre-initialize
(async () => {
  try {
    console.log("Initializing Typst worker...");
    await $typst.svg({ mainContent: "" });
    isInitialized = true;
    self.postMessage({ type: "ready" });
    console.log("Typst worker ready");
  } catch (error) {
    console.error("Typst pre-initialization failed:", error);
    self.postMessage({
      type: "error",
      error: "Failed to initialize Typst compiler",
    });
  }
})();

async function compile(content: string) {
  if (!isInitialized) {
    console.warn("Worker not initialized yet");
    return;
  }

  if (isCompiling) {
    pendingContent = content;
    return;
  }

  isCompiling = true;

  try {
    const vectorData = await $typst.vector({ mainContent: content });
    self.postMessage({ vectorData });

    if (pendingContent !== null) {
      const nextContent = pendingContent;
      pendingContent = null;
      isCompiling = false;
      compile(nextContent);
    } else {
      isCompiling = false;
    }
  } catch (error) {
    console.error("Compilation error:", error);
    self.postMessage({ error: String(error) });
    isCompiling = false;

    if (pendingContent !== null) {
      const nextContent = pendingContent;
      pendingContent = null;
      compile(nextContent);
    }
  }
}

self.onmessage = async (e) => {
  const { content } = e.data;
  if (content !== undefined) {
    compile(content);
  }
};
