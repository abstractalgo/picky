import { useState, type FC } from "react";
import { useProject } from "@/store/ProjectContext";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskSheet } from "@/components/TaskSheet";
import { Sidebar } from "@/components/Sidebar";
import { HoverDebugPanel } from "@/components/HoverStore";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/types";
import { Plus } from "lucide-react";

export const App: FC = () => {
  const { state } = useProject();
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskSheetOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(undefined);
    setDefaultStatus("todo");
    setTaskSheetOpen(true);
  };

  const totalTasks = state.tasks.length;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Picky</h1>
          <span className="text-sm text-muted-foreground">
            {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewTask} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Task
          </Button>
          <Sidebar />
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden">
        <KanbanBoard onEditTask={handleEditTask} />
      </main>

      {/* Task Sheet */}
      <TaskSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        task={selectedTask}
        defaultStatus={defaultStatus}
      />

      {/* Hover Debug Panel */}
      <HoverDebugPanel />
    </div>
  );
};
