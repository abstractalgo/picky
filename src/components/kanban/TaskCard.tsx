import { Draggable } from "@hello-pangea/dnd";
import type { Task } from "@/types";
import { useProject } from "@/store/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Link, User } from "lucide-react";

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: () => void;
}

export function TaskCard({ task, index, onEdit }: TaskCardProps) {
  const { getPersonById, getTagById, getTaskDependencies } = useProject();

  const assignees = task.assigneeIds
    .map(getPersonById)
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const tags = task.tagIds
    .map(getTagById)
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const dependencies = getTaskDependencies(task);

  return (
    <Draggable draggableId={task.id} index={index}>
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
            <CardTitle className="text-sm font-medium leading-tight">
              {task.title}
            </CardTitle>
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
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                <div className="ml-auto flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>
                    {assignees.length > 1
                      ? `${assignees.length} people`
                      : assignees[0].name}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
