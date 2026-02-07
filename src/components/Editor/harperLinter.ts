import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";

// We keep a reference to the linter instance
let harperLinterInstance: any = null;

/**
 * Initializes the Harper Linter.
 * Harper requires a WebAssembly binary. In the browser, 'WorkerLinter' is
 * preferred as it prevents the UI from freezing during heavy linting.
 */
async function getHarperLinter() {
  if (harperLinterInstance) return harperLinterInstance;

  try {
    const harper = await import("harper.js");

    // Harper provides several linter types. For Web/CodeMirror:
    // 1. WorkerLinter: Best for performance (runs in a Web Worker)
    // 2. LocalLinter: Runs on the main thread

    // Note: You usually need to provide the WASM binary.
    // Most setups use 'binaryInlined' for ease of use.
    if (harper.WorkerLinter) {
      harperLinterInstance = new harper.WorkerLinter({
        binary: harper.binaryInlined,
      });
    } else if (harper.LocalLinter) {
      harperLinterInstance = new harper.LocalLinter({
        binary: harper.binaryInlined,
      });
    }

    return harperLinterInstance;
  } catch (error) {
    console.error("Harper initialization failed:", error);
    return null;
  }
}

export const harperLinter = linter(
  async (view) => {
    const hl = await getHarperLinter();
    if (!hl) return [];

    const text = view.state.doc.toString();

    try {
      // Harper's lint method is usually async
      const lints = await hl.lint(text);

      return lints.map((lint: any) => {
        // Harper uses .span() as a function in newer versions
        const span = typeof lint.span === "function" ? lint.span() : lint.span;
        const from = span.start;
        const to = span.end;

        return {
          from,
          to,
          severity: lint.lint_kind === "Spelling" ? "error" : "warning",
          message:
            typeof lint.message === "function" ? lint.message() : lint.message,
          actions: (typeof lint.suggestions === "function"
            ? lint.suggestions()
            : lint.suggestions
          )?.map((sugg: any) => {
            const replacement =
              typeof sugg === "string"
                ? sugg
                : sugg.get_replacement_text?.() || sugg.ReplaceWith;

            return {
              name: `Replace with "${replacement}"`,
              apply(view: EditorView) {
                view.dispatch({
                  changes: { from, to, insert: replacement },
                });
              },
            };
          }),
        };
      });
    } catch (err) {
      console.error("Linting failed:", err);
      return [];
    }
  },
  { delay: 400 },
);
