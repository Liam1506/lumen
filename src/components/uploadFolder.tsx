import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "./ui/field";

interface EditProfileProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  worker: Worker | null;
  // Callback, um die Dateien an den React-State der App zu senden
  onUpload: (
    files: Record<string, string | Uint8Array>,
    mainFile: string,
  ) => void;
}

export function EditProfileDialog({
  isOpen,
  setIsOpen,
  worker,
  onUpload,
}: EditProfileProps) {
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!worker) return;

    const formData = new FormData(e.currentTarget);
    const fileList = formData.getAll("folder") as File[];

    if (fileList.length === 0) return;

    const vfs: Record<string, string | Uint8Array> = {};
    let detectedMainFile = "";

    for (const file of fileList) {
      // Pfad normalisieren: "ordner/datei.typ" -> "datei.typ"
      const pathParts = file.webkitRelativePath.split("/");
      pathParts.shift();
      const relativePath = pathParts.join("/");

      if (!relativePath) continue;

      // Hauptdatei finden
      if (relativePath.endsWith("main.typ")) {
        detectedMainFile = relativePath;
      }

      // Inhalt je nach Typ lesen
      if (file.name.endsWith(".typ") || file.name.endsWith(".txt")) {
        vfs[relativePath] = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        vfs[relativePath] = new Uint8Array(buffer);
      }
    }

    const finalMainFile =
      detectedMainFile ||
      Object.keys(vfs).find((k) => k.endsWith(".typ")) ||
      "";

    // 1. Worker informieren (für die Kompilierung)
    worker.postMessage({
      type: "SYNC_VFS",
      data: {
        files: vfs,
        mainFilePath: finalMainFile,
      },
    });

    // 2. UI informieren (für Sidebar und Editor)
    onUpload(vfs, finalMainFile);

    // Dialog schließen
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleUpload}>
          <DialogHeader>
            <DialogTitle>Projekt hochladen</DialogTitle>
            <DialogDescription>
              Wähle einen Ordner aus, der dein Typst-Projekt enthält.
            </DialogDescription>
          </DialogHeader>

          <Field className="py-4">
            <FieldLabel htmlFor="folder">Ordner</FieldLabel>
            <Input
              id="folder"
              name="folder"
              type="file"
              // @ts-ignore - Spezialattribute für Ordner-Upload
              webkitdirectory=""
              directory=""
              multiple
            />
            <FieldDescription>
              Wir suchen automatisch nach der <strong>main.typ</strong>.
            </FieldDescription>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={!worker}>
              Hochladen & Kompilieren
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
