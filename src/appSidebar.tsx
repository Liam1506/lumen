import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { TreeView } from "./components/tree-view";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <TreeView data={data}></TreeView>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
interface TreeDataItem {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  selectedIcon?: React.ComponentType<{ className?: string }>;
  openIcon?: React.ComponentType<{ className?: string }>;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  disabled?: boolean;
  className?: string;
}
const data: TreeDataItem[] = [
  {
    id: "1",
    name: "Item 1",
    children: [
      {
        id: "2",
        name: "Item 1.1",
        children: [
          {
            id: "3",
            name: "Item 1.1.1",
          },
          {
            id: "4",
            name: "Item 1.1.2",
          },
        ],
      },
      {
        id: "5",
        name: "Item 1.2 (disabled)",
        disabled: true,
      },
    ],
  },
  {
    id: "6",
    name: "Item 2 (draggable)",
    draggable: true,
  },
];
