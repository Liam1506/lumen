import React, { useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

export function TypstEditor() {
  const monaco = useMonaco();
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );

  useEffect(() => {
    if (!monaco) return;

    // 1️⃣ Register Language
    // Check if defined to avoid duplicates on hot-reload
    if (!monaco.languages.getLanguages().some((l) => l.id === "typst")) {
      monaco.languages.register({ id: "typst" });
    }

    // 2️⃣ Define Monarch Tokenizer (Syntax Highlighting)
    monaco.languages.setMonarchTokensProvider("typst", {
      defaultToken: "",
      // Ersetze den "root"-Teil in deinem setMonarchTokensProvider hiermit:

      tokenizer: {
        root: [
          // 1. Kommentare
          [/\/\/.*$/, "comment"],
          [/\/\*/, "comment", "@comment"],

          // 2. Überschriften
          [/^=+ .*/, "keyword"],

          // 3. Math Modus ($...$)
          [/\$.*?\$/, "string.math"],

          // 4. Typst Keywords MIT Hash (#) davor -> Immer hervorheben
          [
            /#\b(let|set|show|if|else|for|while|in|return|break|continue|import|include|as)\b/,
            "keyword",
          ],

          // 5. Keywords OHNE Hash -> HIER WAR DER FEHLER
          // Wir entfernen 'in', 'as', 'is', da diese zu oft normaler Text sind.
          // Wir behalten nur Wörter, die fast immer Code sind (wie 'let', 'import').
          [
            /\b(let|set|show|if|else|for|while|return|break|continue|import|include)\b/,
            "keyword",
          ],

          // ... Rest bleibt gleich (Strings, Funktionen, etc.) ...

          // Strings
          [/"([^"\\]|\\.)*"/, "string"],

          // Funktionen (#func oder func())
          [/#\b[a-zA-Z_]\w*\b/, "function"],
          [/\b[a-zA-Z_]\w*(?=\()/, "function"],

          // Zahlen und Einheiten
          [/\b\d+(\.\d+)?(pt|mm|cm|in|em|fr|%)?\b/, "number"],

          // Text Formatierung
          [/\*.*?\*/, "type"],
          [/_.*?_/, "type"],

          // Operatoren & Klammern
          [/[=+\-*/<>!]+/, "operator"],
          [/[{}()\[\]]/, "@brackets"],
        ],

        // ... (comment state bleibt gleich)
        comment: [
          [/[^/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[/*]/, "comment"],
        ],
      },
    });

    // 3️⃣ Define Theme
    monaco.editor.defineTheme("typstTheme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0", fontStyle: "bold" }, // Purple for let/set
        { token: "function", foreground: "DCDCAA" }, // Yellowish for funcs
        { token: "string", foreground: "CE9178" },
        { token: "string.math", foreground: "098658" }, // Greenish for math
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "569CD6", fontStyle: "bold" }, // Bold/Italic markers
        { token: "operator", foreground: "D4D4D4" },
        { token: "constant", foreground: "569CD6" }, // Booleans
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1f1f1f",
      },
    });

    // 4️⃣ Completion Snippets
    monaco.languages.registerCompletionItemProvider("typst", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: [
            // Correct Typst Function Definition
            {
              label: "#let function",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: ["#let ${1:name}(${2:params}) = {", "\t$0", "}"].join(
                "\n",
              ),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Define a custom function",
              range,
            },
            // Logic
            {
              label: "#if / else",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                "#if ${1:condition} {",
                "\t$0",
                "} else {",
                "\t",
                "}",
              ].join("\n"),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Conditional statement",
              range,
            },
            // Common Elements
            {
              label: "Heading",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "= ${1:Title}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Level 1 Heading",
              range,
            },
            {
              label: "#image",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: '#image("${1:path}", width: ${2:100%})',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "Math Block",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "$ ${1:x} $",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Inline Math",
              range,
            },
            {
              label: "lorem",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "#lorem(${1:50})",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Insert dummy text",
              range,
            },
          ],
        };
      },
    });
  }, [monaco]);

  // Valid Typst Example Code
  const defaultCode = `= Document Title

This is a *bold* statement and this is _italic_.

== Math Example
The area of a circle is defined as:
$ A = pi r^2 $

== Scripting Example
#let greet(name) = {
  [Hello, #name!]
}

#greet("World")

- Item 1
- Item 2
`;

  return (
    <Editor
      height="100%"
      defaultLanguage="typst"
      theme="typstTheme"
      defaultValue={defaultCode}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: "on",
        scrollBeyondLastLine: false,
      }}
      onMount={(editor) => (editorRef.current = editor)}
    />
  );
}
