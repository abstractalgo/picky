import { useMemo, useState } from "react";
import type { Tag } from "@/types";
import { useProject } from "@/store/ProjectContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: Tag;
}

export function TagDialog({ open, onOpenChange, tag }: TagDialogProps) {
  const formKey = tag?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TagDialogForm
        key={formKey}
        tag={tag}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

interface TagDialogFormProps {
  tag?: Tag;
  onClose: () => void;
}

function TagDialogForm({ tag, onClose }: TagDialogFormProps) {
  const { addTag, updateTag, deleteTag } = useProject();
  const isEditing = !!tag;

  const defaultColor = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    []
  );

  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? defaultColor);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    const tagData = {
      name: name.trim(),
      color,
    };

    if (isEditing && tag) {
      updateTag({ ...tag, ...tagData });
    } else {
      addTag(tagData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (tag) {
      deleteTag(tag.id);
      onClose();
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Tag" : "Create Tag"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
          />
        </div>

        <div className="grid gap-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 w-8 rounded border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="customColor"
              className="text-sm text-muted-foreground"
            >
              Custom:
            </Label>
            <Input
              id="customColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-16 cursor-pointer p-1"
            />
            <span className="text-xs text-muted-foreground">{color}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label>Preview:</Label>
          <span
            className="rounded px-2 py-1 text-sm"
            style={{ backgroundColor: color + "20", color }}
          >
            {name || "Tag name"}
          </span>
        </div>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row">
        {isEditing && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="sm:mr-auto"
          >
            Delete
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {isEditing ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
