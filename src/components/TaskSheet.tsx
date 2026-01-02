import { useState } from "react";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUSES, TASK_STATUS_CONFIG } from "@/types";
import { useProject } from "@/store/ProjectContext";
import { HoverTarget } from "@/components/HoverStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultStatus?: TaskStatus;
}

export function TaskSheet({
  open,
  onOpenChange,
  task,
  defaultStatus = "todo",
}: TaskSheetProps) {
  const formKey = task?.id ?? "new";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <TaskSheetForm
        key={formKey}
        task={task}
        defaultStatus={defaultStatus}
        onClose={() => onOpenChange(false)}
      />
    </Sheet>
  );
}

interface TaskSheetFormProps {
  task?: Task;
  defaultStatus: TaskStatus;
  onClose: () => void;
}

function TaskSheetForm({ task, defaultStatus, onClose }: TaskSheetFormProps) {
  const { state, addTask, updateTask, deleteTask } = useProject();
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? defaultStatus
  );
  const [storyPoints, setStoryPoints] = useState<number | undefined>(
    task?.storyPoints
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assigneeIds ?? []
  );
  const [tagIds, setTagIds] = useState<string[]>(task?.tagIds ?? []);
  const [dependencyIds, setDependencyIds] = useState<Task["id"][]>(
    task?.dependencyIds ?? []
  );
  const [milestoneId, setMilestoneId] = useState<string | undefined>(
    task?.milestoneId
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.startDate ? new Date(task.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    task?.endDate ? new Date(task.endDate) : undefined
  );
  const [dependencySearch, setDependencySearch] = useState("");

  const saveIfEditing = (updates: Partial<Task>) => {
    if (isEditing && task) {
      updateTask({
        ...task,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        storyPoints,
        assigneeIds,
        tagIds,
        dependencyIds,
        milestoneId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        ...updates,
      });
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (value.trim()) {
      saveIfEditing({ title: value.trim() });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    saveIfEditing({ description: value.trim() || undefined });
  };

  const handleStatusChange = (value: TaskStatus) => {
    setStatus(value);
    saveIfEditing({ status: value });
  };

  const handleStoryPointsChange = (value: number | undefined) => {
    setStoryPoints(value);
    saveIfEditing({ storyPoints: value });
  };

  const handleStartDateChange = (value: Date | undefined) => {
    setStartDate(value);
    saveIfEditing({ startDate: value?.toISOString() });
  };

  const handleEndDateChange = (value: Date | undefined) => {
    setEndDate(value);
    saveIfEditing({ endDate: value?.toISOString() });
  };

  const handleMilestoneChange = (value: string | undefined) => {
    setMilestoneId(value);
    saveIfEditing({ milestoneId: value });
  };

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      storyPoints,
      assigneeIds,
      tagIds,
      dependencyIds,
      milestoneId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });

    onClose();
  };

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      onClose();
    }
  };

  const toggleAssignee = (id: string) => {
    const newAssigneeIds = assigneeIds.includes(id)
      ? assigneeIds.filter((a) => a !== id)
      : [...assigneeIds, id];
    setAssigneeIds(newAssigneeIds);
    saveIfEditing({ assigneeIds: newAssigneeIds });
  };

  const toggleTag = (id: string) => {
    const newTagIds = tagIds.includes(id)
      ? tagIds.filter((t) => t !== id)
      : [...tagIds, id];
    setTagIds(newTagIds);
    saveIfEditing({ tagIds: newTagIds });
  };

  const addDependency = (id: Task["id"]) => {
    if (!dependencyIds.includes(id)) {
      const newDependencyIds = [...dependencyIds, id];
      setDependencyIds(newDependencyIds);
      saveIfEditing({ dependencyIds: newDependencyIds });
    }
    setDependencySearch("");
  };

  const removeDependency = (id: Task["id"]) => {
    const newDependencyIds = dependencyIds.filter((d) => d !== id);
    setDependencyIds(newDependencyIds);
    saveIfEditing({ dependencyIds: newDependencyIds });
  };

  const availableTasks = state.tasks.filter((t) => t.id !== task?.id);
  const searchResults = dependencySearch.trim()
    ? availableTasks.filter(
        (t) =>
          !dependencyIds.includes(t.id) &&
          t.title.toLowerCase().includes(dependencySearch.toLowerCase())
      )
    : [];
  const selectedDependencies = availableTasks.filter((t) =>
    dependencyIds.includes(t.id)
  );

  return (
    <SheetContent className="flex w-full flex-col sm:max-w-md px-4">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">#{task.id}</span>
              {task.title}
            </span>
          ) : (
            "Create Task"
          )}
        </SheetTitle>
      </SheetHeader>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => handleStatusChange(v as TaskStatus)}
              >
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

            <div className="grid gap-2">
              <Label htmlFor="storyPoints">Story Points</Label>
              <Input
                id="storyPoints"
                type="number"
                min={0}
                value={storyPoints ?? ""}
                onChange={(e) =>
                  handleStoryPointsChange(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="0"
              />
            </div>
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
                    onSelect={handleStartDateChange}
                  />
                  {startDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => handleStartDateChange(undefined)}
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
                    {endDate ? format(endDate, "PP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                  />
                  {endDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEndDateChange(undefined)}
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
                onValueChange={(v) =>
                  handleMilestoneChange(v === "none" ? undefined : v)
                }
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
                  <HoverTarget
                    key={person.id}
                    payload={{ type: "person", data: person }}
                  >
                    <Badge
                      variant={
                        assigneeIds.includes(person.id) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleAssignee(person.id)}
                    >
                      {person.name}
                    </Badge>
                  </HoverTarget>
                ))}
              </div>
            </div>
          )}

          {state.tags.length > 0 && (
            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {state.tags.map((tag) => (
                  <HoverTarget
                    key={tag.id}
                    payload={{ type: "tag", data: tag }}
                  >
                    <Badge
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
                  </HoverTarget>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Dependencies</Label>
            <div className="relative">
              <Input
                value={dependencySearch}
                onChange={(e) => setDependencySearch(e.target.value)}
                placeholder="Search tasks to add as dependency..."
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border border-border bg-popover shadow-md">
                  {searchResults.slice(0, 5).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => addDependency(t.id)}
                    >
                      #{t.id} {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedDependencies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDependencies.map((t) => (
                  <HoverTarget
                    key={t.id}
                    payload={{ type: "task", data: t }}
                  >
                    <Badge variant="secondary" className="gap-1">
                      #{t.id} {t.title}
                      <button
                        type="button"
                        onClick={() => removeDependency(t.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </HoverTarget>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <SheetFooter className="flex-row gap-2 border-t pt-4">
        {isEditing && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="mr-auto"
          >
            Delete
          </Button>
        )}
        {!isEditing && (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>
              Create
            </Button>
          </>
        )}
      </SheetFooter>
    </SheetContent>
  );
}
