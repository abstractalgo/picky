import { Draggable } from "@hello-pangea/dnd";
import type { Task } from "@/types";
import { useProject } from "@/store/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Flag, Link } from "lucide-react";

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: () => void;
}

export function TaskCard({ task, index, onEdit }: TaskCardProps) {
  const { getPersonById, getTagById, getMilestoneById, getTaskDependencies } =
    useProject();

  const assignees = task.assigneeIds
    .map(getPersonById)
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const tags = task.tagIds
    .map(getTagById)
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const dependencies = getTaskDependencies(task);
  const milestone = task.milestoneId
    ? getMilestoneById(task.milestoneId)
    : undefined;

  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-2 cursor-pointer transition-shadow hover:shadow-md",
            snapshot.isDragging && "rotate-2 shadow-lg"
          )}
          onClick={onEdit}
        >
          <CardHeader className="p-3 pb-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground">
                  #{task.id}
                </span>
                <CardTitle className="text-sm font-medium leading-tight">
                  {task.title}
                </CardTitle>
              </div>
              {task.storyPoints !== undefined && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {task.storyPoints}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1">
            {task.description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {task.description}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {milestone && (
                <div className="flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  <span>{milestone.name}</span>
                </div>
              )}

              {task.endDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(task.endDate).toLocaleDateString()}</span>
                </div>
              )}

              {dependencies.length > 0 && (
                <div className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  <span>{dependencies.length}</span>
                </div>
              )}

              {assignees.length > 0 && (
                <div className="ml-auto flex -space-x-1.5">
                  {assignees.slice(0, 3).map((person) => (
                    <img
                      key={person.id}
                      src={person.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(person.name)}`}
                      alt={person.name}
                      title={person.name}
                      className="h-5 w-5 rounded-full border border-background"
                    />
                  ))}
                  {assignees.length > 3 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-medium">
                      +{assignees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
