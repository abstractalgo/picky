import { useState, useEffect, useCallback, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Play, Square, StopCircle } from "lucide-react";
import type { AgentAction } from "@/components/ai-agent";
import { cn } from "@/lib/utils";

export interface PendingAction {
  index: number;
  action: AgentAction;
  cancelled: boolean;
}

interface ActionConfirmationToastProps {
  actions: AgentAction[];
  onConfirm: (actionsToExecute: AgentAction[]) => void;
  onCancelAll: () => void;
  countdownSeconds?: number;
}

function formatActionLabel(action: AgentAction): string {
  switch (action.type) {
    case "addTask":
      return `Add task: "${action.payload.title}"`;
    case "updateTask":
      return `Update task #${action.payload.id}: "${action.payload.title}"`;
    case "deleteTask":
      return `Delete task #${action.payload.id}`;
    case "moveTask":
      return `Move task #${action.payload.taskId} to ${action.payload.newStatus}`;
    case "addPerson":
      return `Add person: "${action.payload.name}"`;
    case "updatePerson":
      return `Update person: "${action.payload.name}"`;
    case "deletePerson":
      return `Delete person #${action.payload.id}`;
    case "addMilestone":
      return `Add milestone: "${action.payload.name}"`;
    case "updateMilestone":
      return `Update milestone: "${action.payload.name}"`;
    case "deleteMilestone":
      return `Delete milestone #${action.payload.id}`;
    case "addTag":
      return `Add tag: "${action.payload.name}"`;
    case "updateTag":
      return `Update tag: "${action.payload.name}"`;
    case "deleteTag":
      return `Delete tag #${action.payload.id}`;
  }
}

export const ActionConfirmationToast: FC<ActionConfirmationToastProps> = ({
  actions,
  onConfirm,
  onCancelAll,
  countdownSeconds = 5,
}) => {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() =>
    actions.map((action, index) => ({ index, action, cancelled: false }))
  );
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isPaused, setIsPaused] = useState(false);

  const activeActions = pendingActions.filter((a) => !a.cancelled);

  const handleCancelAction = useCallback((index: number) => {
    setPendingActions((prev) =>
      prev.map((a) => (a.index === index ? { ...a, cancelled: true } : a))
    );
  }, []);

  const handleCancelAndStop = useCallback((fromIndex: number) => {
    setPendingActions((prev) =>
      prev.map((a) => (a.index >= fromIndex ? { ...a, cancelled: true } : a))
    );
  }, []);

  const handleExecuteNow = useCallback(() => {
    const toExecute = pendingActions
      .filter((a) => !a.cancelled)
      .map((a) => a.action);
    onConfirm(toExecute);
  }, [pendingActions, onConfirm]);

  useEffect(() => {
    if (isPaused || activeActions.length === 0) {
      return;
    }

    if (countdown <= 0) {
      handleExecuteNow();
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isPaused, activeActions.length, handleExecuteNow]);

  // If all actions cancelled, close the toast
  useEffect(() => {
    if (activeActions.length === 0) {
      onCancelAll();
    }
  }, [activeActions.length, onCancelAll]);

  return (
    <div
      className="w-96 rounded-lg border border-border bg-background p-4 shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            Execute {activeActions.length} action
            {activeActions.length !== 1 && "s"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-primary">{countdown}s</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="h-6 w-6 p-0"
            title={isPaused ? "Resume countdown" : "Pause countdown"}
          >
            {isPaused ? (
              <Play className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="max-h-48 space-y-1 overflow-y-auto">
        {pendingActions.map((pa) => (
          <div
            key={pa.index}
            className={cn(
              "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs",
              pa.cancelled
                ? "bg-muted/50 text-muted-foreground line-through"
                : "bg-muted"
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {formatActionLabel(pa.action)}
            </span>
            {!pa.cancelled && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelAction(pa.index)}
                  className="h-5 px-1.5 text-[10px]"
                  title="Cancel this action"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelAndStop(pa.index)}
                  className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive"
                  title="Cancel this and all following actions"
                >
                  <StopCircle className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleExecuteNow}
          disabled={activeActions.length === 0}
          className="flex-1"
        >
          Execute Now
        </Button>
        <Button variant="outline" size="sm" onClick={onCancelAll}>
          Cancel All
        </Button>
      </div>
    </div>
  );
};
