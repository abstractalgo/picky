import { Droppable } from "@hello-pangea/dnd";
import type { Task, TaskStatus } from "@/types";
import { TASK_STATUS_CONFIG } from "@/types";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HoverTarget } from "../HoverStore";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, onEditTask }: KanbanColumnProps) {
  const config = TASK_STATUS_CONFIG[status];

  return (
    <HoverTarget
      payload={{
        type: "status",
        data: status,
      }}
    >
      <div className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-muted/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={cn("rounded px-2 py-0.5 text-xs", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
        </div>
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <ScrollArea className="flex-1">
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "min-h-full p-2 transition-colors gap-2",
                  snapshot.isDraggingOver && "bg-accent/50"
                )}
              >
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onEdit={() => onEditTask(task)}
                  />
                ))}
                {provided.placeholder}
              </div>
            </ScrollArea>
          )}
        </Droppable>
      </div>
    </HoverTarget>
  );
}
