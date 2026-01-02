import { toast } from "sonner";
import type { AgentAction } from "./ai-agent";
import { executeActions } from "./ai-agent";
import { useHistoryStore } from "@/store/historyStore";
import { SingleActionToast } from "./ActionConfirmationToast";
import { UndoToast } from "./UndoToast";

type ActionDecision = "execute" | "skip" | "stop";

/**
 * Show a toast for a single action and wait for user decision
 */
function showActionToast(
  action: AgentAction,
  currentIndex: number,
  totalCount: number
): Promise<ActionDecision> {
  return new Promise((resolve) => {
    let resolved = false;

    const handleDecision = (decision: ActionDecision) => {
      if (resolved) {
        return;
      }
      resolved = true;
      toast.dismiss(toastId);
      resolve(decision);
    };

    const toastId = toast.custom(
      () => (
        <SingleActionToast
          action={action}
          currentIndex={currentIndex}
          totalCount={totalCount}
          onExecute={() => handleDecision("execute")}
          onSkip={() => handleDecision("skip")}
          onStop={() => handleDecision("stop")}
        />
      ),
      {
        duration: Infinity,
        position: "bottom-right",
      }
    );
  });
}

/**
 * Execute actions sequentially with individual confirmation toasts.
 * Each action gets its own toast. Actions are processed one at a time.
 */
export async function executeActionsWithConfirmation(
  actions: AgentAction[],
  description?: string
): Promise<void> {
  if (actions.length === 0) {
    return;
  }

  const executedActions: AgentAction[] = [];
  let historyId: string | null = null;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const decision = await showActionToast(action, i, actions.length);

    if (decision === "stop") {
      // User chose to stop - skip this and all remaining actions
      break;
    }

    if (decision === "skip") {
      // User chose to skip just this action
      continue;
    }

    // decision === "execute"
    // Capture snapshot before first execution
    if (executedActions.length === 0) {
      historyId = useHistoryStore
        .getState()
        .captureSnapshot(
          actions,
          description || `Executed ${actions.length} actions`
        );
    }

    // Execute this single action
    executeActions([action]);
    executedActions.push(action);
  }

  // Show undo toast if any actions were executed
  if (executedActions.length > 0 && historyId) {
    const finalHistoryId = historyId;
    toast.custom(
      (t) => (
        <UndoToast
          actionCount={executedActions.length}
          onUndo={() => {
            toast.dismiss(t);
            const success = useHistoryStore.getState().undo(finalHistoryId);
            if (success) {
              toast.success("Actions undone");
            } else {
              toast.error("Failed to undo");
            }
          }}
        />
      ),
      {
        duration: 5000,
        position: "bottom-right",
      }
    );
  } else if (executedActions.length === 0) {
    toast.info("No actions executed");
  }
}

/**
 * Hook for accessing undo functionality from UI
 */
export function useUndoActions() {
  const entries = useHistoryStore((s) => s.entries);
  const undoLastFn = useHistoryStore((s) => s.undoLast);
  const undoFn = useHistoryStore((s) => s.undo);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  return {
    canUndo: entries.length > 0,
    lastEntry: entries[0] ?? null,
    entries,
    undoLast: () => {
      const success = undoLastFn();
      if (success) {
        toast.success("Actions undone");
      }
      return success;
    },
    undo: (id: string) => {
      const success = undoFn(id);
      if (success) {
        toast.success("Actions undone");
      }
      return success;
    },
    clearHistory,
  };
}
