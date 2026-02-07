import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { TreeView } from "./components/ui/tree-view";
import { Button } from "./components/ui/button";
import { FileTextIcon, FileIcon, FolderIcon } from "lucide-react";

interface TreeDataItem {
  id: string;
  name: string;
  icon?: any;
  children?: TreeDataItem[];
  onClick?: () => void;
  className?: string;
}

interface SidebarProps {
  files: Record<string, string | Uint8Array>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onOpenProfile: () => void;
}

export function AppSidebar({
  files,
  activeFile,
  onSelectFile,
  onOpenProfile,
}: SidebarProps) {
  // Funktion, um flache Pfade in eine Baumstruktur zu konvertieren
  const buildTree = (filePaths: string[]): TreeDataItem[] => {
    const root: TreeDataItem[] = [];

    filePaths.forEach((path) => {
      const parts = path.split("/");
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join("/");

        let existingPath = currentLevel.find((item) => item.name === part);

        if (!existingPath) {
          existingPath = {
            id: currentPath,
            name: part,
            icon: isFile
              ? part.endsWith(".typ")
                ? FileTextIcon
                : FileIcon
              : FolderIcon,
            children: isFile ? undefined : [],
            className:
              currentPath === activeFile
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "",
            // Nur Dateien triggern den Editor-Wechsel
            onClick: isFile ? () => onSelectFile(currentPath) : undefined,
          };
          currentLevel.push(existingPath);
        }

        if (!isFile && existingPath.children) {
          currentLevel = existingPath.children;
        }
      });
    });

    return root;
  };

  const treeData = buildTree(Object.keys(files));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Button className="w-full" onClick={onOpenProfile}>
          Projekt hochladen
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dateien
          </div>
          <TreeView data={treeData} />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
