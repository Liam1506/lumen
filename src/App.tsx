import { useState, useMemo, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { AppSidebar } from "./appSidebar";
import TypstEditor2 from "./components/Editor/typstCodeEditor";
import { EditProfileDialog } from "./components/uploadFolder";
import TypstWorker from "./worker/typst.worker2.ts?worker";
import TypstPreviewView2 from "./views/TypstPreviewView2";
import { testString } from "./views/testString";

export function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [files, setFiles] = useState<Record<string, string | Uint8Array>>({
    "main.typ": testString,
  });
  const [activeFile, setActiveFile] = useState("main.typ");

  const worker = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new TypstWorker();
  }, []);

  // Initial compilation when worker is ready
  useEffect(() => {
    if (!worker) return;

    console.log("App: Sending initial compilation request");
    worker.postMessage({
      type: "SYNC_VFS",
      data: {
        files: files,
        mainFilePath: activeFile,
      },
    });
  }, [worker]); // Only run once when worker is created

  // Recompile whenever files or activeFile changes
  useEffect(() => {
    if (!worker) return;

    console.log("App: Files changed, recompiling");
    worker.postMessage({
      type: "SYNC_VFS",
      data: {
        files: files,
        mainFilePath: activeFile,
      },
    });
  }, [files, activeFile, worker]);

  // Editor-Änderungen an Worker senden
  const handleCodeChange = (newContent: string) => {
    setFiles((prev) => ({ ...prev, [activeFile]: newContent }));
    // Note: The useEffect above will trigger compilation automatically
  };

  const activeContent = files[activeFile];
  const isEditable = typeof activeContent === "string";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar
          files={files}
          activeFile={activeFile}
          onSelectFile={setActiveFile}
          onOpenProfile={() => setIsDialogOpen(true)}
        />
        <main className="flex flex-1 flex-col h-full overflow-hidden">
          <SidebarTrigger />
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50}>
              {isEditable ? (
                <TypstEditor2
                  value={activeContent as string}
                  onChange={handleCodeChange}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Binärdatei
                </div>
              )}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <div className="h-full bg-slate-100 overflow-auto">
                <TypstPreviewView2 worker={worker} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
      <EditProfileDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        worker={worker}
        onUpload={(newFiles, main) => {
          setFiles(newFiles);
          setActiveFile(main);
        }}
      />
    </SidebarProvider>
  );
}

export default App;
