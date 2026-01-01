import { useState } from "react";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES, TASK_STATUS_CONFIG } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultStatus?: TaskStatus;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "todo",
}: TaskDialogProps) {
  // Use key to reset form state when task changes
  const formKey = task?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TaskDialogForm
        key={formKey}
        task={task}
        defaultStatus={defaultStatus}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

interface TaskDialogFormProps {
  task?: Task;
  defaultStatus: TaskStatus;
  onClose: () => void;
}

function TaskDialogForm({ task, defaultStatus, onClose }: TaskDialogFormProps) {
  const { state, addTask, updateTask, deleteTask } = useProject();
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds ?? []);
  const [tagIds, setTagIds] = useState<string[]>(task?.tagIds ?? []);
  const [dependencyIds, setDependencyIds] = useState<string[]>(task?.dependencyIds ?? []);
  const [milestoneId, setMilestoneId] = useState<string | undefined>(task?.milestoneId);
  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.startDate ? new Date(task.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    task?.endDate ? new Date(task.endDate) : undefined
  );

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      assigneeIds,
      tagIds,
      dependencyIds,
      milestoneId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };

    if (isEditing && task) {
      updateTask({
        ...task,
        ...taskData,
      });
    } else {
      addTask(taskData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      onClose();
    }
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleDependency = (id: string) => {
    setDependencyIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const availableTasks = state.tasks.filter((t) => t.id !== task?.id);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
      </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
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
              <Label>Due Date</Label>
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
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
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

          {state.milestones.length > 0 && (
            <div className="grid gap-2">
              <Label>Milestone</Label>
              <Select
                value={milestoneId || "none"}
                onValueChange={(v) => setMilestoneId(v === "none" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No milestone</SelectItem>
                  {state.milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {state.people.length > 0 && (
            <div className="grid gap-2">
              <Label>Assignees</Label>
              <div className="flex flex-wrap gap-2">
                {state.people.map((person) => (
                  <Badge
                    key={person.id}
                    variant={assigneeIds.includes(person.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAssignee(person.id)}
                  >
                    {person.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {state.tags.length > 0 && (
            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {state.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={tagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      tagIds.includes(tag.id)
                        ? { backgroundColor: tag.color, borderColor: tag.color }
                        : { borderColor: tag.color, color: tag.color }
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {availableTasks.length > 0 && (
            <div className="grid gap-2">
              <Label>Dependencies</Label>
              <div className="flex flex-wrap gap-2">
                {availableTasks.map((t) => (
                  <Badge
                    key={t.id}
                    variant={dependencyIds.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDependency(t.id)}
                  >
                    {t.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEditing && (
            <Button variant="destructive" onClick={handleDelete} className="sm:mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
      </DialogFooter>
    </DialogContent>
  );
}
