import { toast } from "sonner";
import type { AgentAction } from "./ai-agent";
import { executeActions } from "./ai-agent";
import { useHistoryStore } from "@/store/historyStore";
import { ActionConfirmationToast } from "./ActionConfirmationToast";
import { UndoToast } from "./UndoToast";

/**
 * Execute actions with pre-confirmation countdown and post-execution undo toast.
 * Shows a batched toast with all actions, allowing per-action cancellation.
 */
export function executeActionsWithConfirmation(
  actions: AgentAction[],
  description?: string
): void {
  if (actions.length === 0) {
    return;
  }

  // Show pre-execution confirmation toast
  toast.custom(
    (t) => (
      <ActionConfirmationToast
        actions={actions}
        onConfirm={(actionsToExecute: AgentAction[]) => {
          toast.dismiss(t);
          if (actionsToExecute.length > 0) {
            performExecution(actionsToExecute, description);
          } else {
            toast.info("No actions to execute");
          }
        }}
        onCancelAll={() => {
          toast.dismiss(t);
          toast.info("Execution cancelled");
        }}
      />
    ),
    {
      duration: Infinity, // Don't auto-dismiss during countdown
      position: "bottom-right",
    }
  );
}

function performExecution(actions: AgentAction[], description?: string): void {
  // Capture snapshot BEFORE execution
  const historyId = useHistoryStore
    .getState()
    .captureSnapshot(
      actions,
      description || `Executed ${actions.length} actions`
    );

  // Execute the actions
  executeActions(actions);

  // Show post-execution undo toast
  toast.custom(
    (t) => (
      <UndoToast
        actionCount={actions.length}
        onUndo={() => {
          toast.dismiss(t);
          const success = useHistoryStore.getState().undo(historyId);
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
