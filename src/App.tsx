import { useState, type FC } from "react";
import { ProjectProvider, useProject } from "@/store/ProjectContext";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskDialog } from "@/components/dialogs/TaskDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/types";
import { Plus } from "lucide-react";

function AppContent() {
  const { state } = useProject();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(undefined);
    setDefaultStatus("todo");
    setTaskDialogOpen(true);
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

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}

export const App: FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};
