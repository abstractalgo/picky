import { useState, useEffect, type FC } from "react";
import { Button } from "../components/ui/button";
import { Clock, Play, Square, StopCircle, SkipForward } from "lucide-react";
import type { AgentAction } from "../components/ai-agent";

interface SingleActionToastProps {
  action: AgentAction;
  currentIndex: number;
  totalCount: number;
  onExecute: () => void;
  onSkip: () => void;
  onStop: () => void;
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
    case "addAssignee":
      return `Add assignee ${action.payload.personId} to task #${action.payload.taskId}`;
    case "removeAssignee":
      return `Remove assignee ${action.payload.personId} from task #${action.payload.taskId}`;
  }
}

export const SingleActionToast: FC<SingleActionToastProps> = ({
  action,
  currentIndex,
  totalCount,
  onExecute,
  onSkip,
  onStop,
  countdownSeconds = 5,
}) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    if (countdown <= 0) {
      onExecute();
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isPaused, onExecute]);

  const hasMoreActions = currentIndex < totalCount - 1;

  return (
    <div
      className="w-80 rounded-lg border border-border bg-background p-4 shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">
            Action {currentIndex + 1} of {totalCount}
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

      {/* Action details */}
      <div className="mb-3 rounded bg-muted p-2">
        <div className="mb-1 font-mono text-xs font-medium text-primary">
          {action.type}
        </div>
        <div className="text-xs text-foreground">
          {formatActionLabel(action)}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onExecute}
          className="flex-1"
        >
          Execute Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          title="Skip this action"
        >
          <SkipForward className="h-3 w-3" />
        </Button>
        {hasMoreActions && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="text-destructive hover:text-destructive"
            title="Skip this and all remaining actions"
          >
            <StopCircle className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
