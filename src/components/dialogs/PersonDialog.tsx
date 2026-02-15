import { useState } from "react";
import type { Person } from "@/types";
import { useProject } from "@/store/ProjectContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person;
}

export function PersonDialog({
  open,
  onOpenChange,
  person,
}: PersonDialogProps) {
  const formKey = person?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PersonDialogForm
        key={formKey}
        person={person}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

interface PersonDialogFormProps {
  person?: Person;
  onClose: () => void;
}

function PersonDialogForm({ person, onClose }: PersonDialogFormProps) {
  const { addPerson, updatePerson, deletePerson } = useProject();
  const isEditing = !!person;

  const [name, setName] = useState(person?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(person?.avatarUrl ?? "");

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    const personData = {
      name: name.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
    };

    if (isEditing && person) {
      updatePerson({ ...person, ...personData });
    } else {
      addPerson(personData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (person) {
      deletePerson(person.id);
      onClose();
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Person" : "Add Person"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
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
          {isEditing ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
