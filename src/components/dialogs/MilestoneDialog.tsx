import { useState } from "react";
import type { Milestone } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: Milestone;
}

export function MilestoneDialog({
  open,
  onOpenChange,
  milestone,
}: MilestoneDialogProps) {
  const formKey = milestone?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MilestoneDialogForm
        key={formKey}
        milestone={milestone}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

interface MilestoneDialogFormProps {
  milestone?: Milestone;
  onClose: () => void;
}

function MilestoneDialogForm({ milestone, onClose }: MilestoneDialogFormProps) {
  const { addMilestone, updateMilestone, deleteMilestone } = useProject();
  const isEditing = !!milestone;

  const [name, setName] = useState(milestone?.name ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    milestone?.startDate ? new Date(milestone.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    milestone?.endDate ? new Date(milestone.endDate) : undefined
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    const milestoneData = {
      name: name.trim(),
      description: description.trim() || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };

    if (isEditing && milestone) {
      updateMilestone({ ...milestone, ...milestoneData });
    } else {
      addMilestone(milestoneData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (milestone) {
      deleteMilestone(milestone.id);
      onClose();
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit Milestone" : "Create Milestone"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Milestone name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Milestone description"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                />
                {startDate && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setStartDate(undefined)}
                    >
                      <X className="mr-2 h-4 w-4" /> Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                />
                {endDate && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setEndDate(undefined)}
                    >
                      <X className="mr-2 h-4 w-4" /> Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
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
