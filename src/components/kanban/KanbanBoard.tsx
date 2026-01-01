import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useProject } from "@/store/ProjectContext";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  onEditTask: (task: Task) => void;
}

export function KanbanBoard({ onEditTask }: KanbanBoardProps) {
  const { state, moveTask } = useProject();

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    moveTask(draggableId, newStatus);
  };

  const getTasksByStatus = (status: TaskStatus) =>
    state.tasks.filter((t) => t.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-x-auto">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            onEditTask={onEditTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
