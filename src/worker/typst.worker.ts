import {
  createTypstCompiler,
  FetchPackageRegistry,
} from "@myriaddreamin/typst.ts";

const decoder = new TextDecoder();
let compiler: any = null;

// Package cache
const packageCache = new Map<string, Uint8Array>();

// Fetch package from Typst registry
async function fetchPackage(spec: string): Promise<Uint8Array> {
  if (packageCache.has(spec)) {
    console.log("Worker: Using cached package:", spec);
    return packageCache.get(spec)!;
  }

  console.log("Worker: Fetching package:", spec);

  // Format: @preview/name:version
  const match = spec.match(/@([^\/]+)\/([^:]+):(.+)/);
  if (!match) {
    throw new Error(`Invalid package spec: ${spec}`);
  }

  const [, namespace, name, version] = match;
  const url = `https://packages.typst.org/preview/${name}-${version}.tar.gz`;

  console.log("Worker: Downloading from:", url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch package: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  packageCache.set(spec, data);

  console.log("Worker: Package downloaded, size:", data.length);
  return data;
}

// Initialize compiler
const initPromise = (async () => {
  console.log("Worker: Starting initialization...");
  try {
    compiler = createTypstCompiler();

    console.log("Worker: Compiler instance created");

    const fetchPackageRegistry = await new FetchPackageRegistry(fetchPackage);

    await compiler.init({
      beforeBuild: [
        () => {
          console.log("Worker: Setting up package registry...");
          compiler.registry = fetchPackageRegistry;
        },
      ],
      getModule: () => "/wasm/typst_ts_web_compiler_bg.wasm",
    });

    console.log("Worker: Compiler initialized");
    console.log(
      "Worker: Available compiler methods:",
      Object.keys(compiler).filter((k) => typeof compiler[k] === "function"),
    );
  } catch (err) {
    console.error("Worker: Initialization failed", err);
    throw err;
  }
})();

async function compile(
  vfs: Record<string, string | Uint8Array>,
  mainFile: string,
) {
  await initPromise;
  console.log("Worker: Compile invoked");

  if (!compiler) {
    console.error("Worker: Compiler still not available after init!");
    self.postMessage({
      type: "error",
      error: "Compiler not initialized",
    });
    return;
  }

  try {
    compiler.reset();

    console.log("Worker: Adding files to VFS:", Object.keys(vfs));

    Object.entries(vfs).forEach(([path, content]) => {
      const absolutePath = path.startsWith("/") ? path : `/${path}`;

      let contentString: string;

      if (typeof content === "string") {
        contentString = content;
      } else {
        contentString = decoder.decode(content);
      }

      console.log(
        `Worker: Adding ${absolutePath}, length: ${contentString.length} chars`,
      );
      compiler.addSource(absolutePath, contentString);
    });

    const absoluteMain = mainFile.startsWith("/") ? mainFile : `/${mainFile}`;

    console.log(`Worker: Compiling ${absoluteMain}`);

    const result = await compiler.compile({
      mainFilePath: absoluteMain,
    });

    console.log("Worker: Compilation result:", result);

    // Check for compilation errors
    if (result?.hasError) {
      const diagnostics = result.diagnostics || [];
      console.error("Worker: Compilation errors:", diagnostics);

      const errorMessages = diagnostics
        .filter((d: any) => d.severity === "error")
        .map((d: any) => {
          const msg = d.message || String(d);
          return `${msg}`;
        })
        .join("\n\n");

      self.postMessage({
        type: "error",
        error: errorMessages || "Compilation failed",
      });
      return;
    }

    // Find vector data
    let vectorData = null;

    if (result instanceof Uint8Array) {
      vectorData = result;
    } else if (result && typeof result === "object") {
      // Check common property names
      const possibleKeys = [
        "result",
        "output",
        "data",
        "artifact",
        "vector",
        "doc",
        "document",
      ];

      for (const key of possibleKeys) {
        if (result[key] instanceof Uint8Array && result[key].length > 0) {
          vectorData = result[key];
          console.log(`Worker: ✓ Found vector data in result.${key}`);
          break;
        }
      }

      // If not found, search all properties
      if (!vectorData) {
        for (const [key, value] of Object.entries(result)) {
          if (value instanceof Uint8Array && value.length > 0) {
            vectorData = value;
            console.log(`Worker: ✓ Found vector data in result.${key}`);
            break;
          }
        }
      }
    }

    if (vectorData && vectorData.length > 0) {
      console.log(
        "Worker: ✓ Compilation success! Sending data, length:",
        vectorData.length,
      );

      self.postMessage(
        { type: "render", vectorData: vectorData },
        { transfer: [vectorData.buffer] },
      );
    } else {
      console.error("Worker: ✗ No vector data found");

      self.postMessage({
        type: "error",
        error: "Compilation produced no output",
      });
    }
  } catch (err) {
    console.error("Worker: Compile Error", err);

    self.postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === "SYNC_VFS" || type === "UPDATE_FILE") {
    if (data && data.files) {
      await compile(data.files, data.mainFilePath);
    }
  }
};
