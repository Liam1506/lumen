import { AppSidebar } from "./appSidebar";
import TypstEditor2 from "./components/typstCodeEditor";
import { TypstEditor } from "./components/typstEditor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import TypstPreviewView from "./views/TypstPreviewView";
import React, { useState } from "react";

export function App() {
  const [code, setCode] = useState<string>(
    "= Hello Typst\n\nWrite something...",
  );
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider>
        <AppSidebar />

        <main className="flex flex-1 flex-col h-full overflow-hidden">
          <SidebarTrigger />

          <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
            {/* Panel 1: Added minSize (percentage) */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full w-full">
                <TypstEditor2 value={code} onChange={setCode} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Panel 2: Added minSize (percentage) */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full overflow-auto">
                <TypstPreviewView code={code} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </SidebarProvider>
    </div>
  );
}

export default App;
