import { useState, type FormEvent } from "react";
import { useProjectAgent } from "../components/ai-agent";
import {
  executeActionsWithConfirmation,
  useUndoActions,
} from "../components/action-executor-with-confirmation";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Bot,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentDebugPanel() {
  const [goal, setGoal] = useState("give me all tasks that are overdue");
  const [isExpanded, setIsExpanded] = useState(false);
  const { isLoading, error, lastResult, runGoal } = useProjectAgent();
  const { canUndo, undoLast } = useUndoActions();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) {
      return;
    }
    await runGoal(goal.trim());
  };

  const handleExecute = () => {
    if (lastResult) {
      executeActionsWithConfirmation(lastResult.actions, goal);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur transition-all",
        isExpanded ? "w-96" : "w-auto",
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-border p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Agent</h3>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        {!isExpanded && lastResult && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {lastResult.actions.length} actions
          </span>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Goal Input */}
          <form onSubmit={handleSubmit} className="border-b border-border p-3">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Enter a goal for the AI agent..."
              className="mb-2 min-h-[60px] text-sm"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !goal.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Run Goal
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 border-b border-border bg-destructive/10 p-3 text-xs text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <div className="max-h-24 overflow-auto">{error}</div>
            </div>
          )}

          {/* Results */}
          {lastResult && (
            <div className="max-h-64 overflow-auto p-3">
              {/* Reasoning */}
              {lastResult.reasoning && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Reasoning
                  </div>
                  <div className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap">
                    {lastResult.reasoning}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Actions ({lastResult.actions.length})
                </span>
                {lastResult.actions.length > 0 && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleExecute}
                      className="h-6 text-xs"
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      Execute All
                    </Button>
                    {canUndo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={undoLast}
                        className="h-6 text-xs"
                        title="Undo last action"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {lastResult.actions.length === 0 ? (
                <div className="flex items-center gap-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No actions needed (query only)
                </div>
              ) : (
                <div className="space-y-1">
                  {lastResult.actions.map((action, i) => (
                    <div
                      key={i}
                      className="rounded border border-border bg-muted/50 p-2 text-xs"
                    >
                      <span className="font-mono font-medium text-primary">
                        {action.type}
                      </span>
                      <pre className="mt-1 max-h-32 overflow-auto text-[10px] text-muted-foreground">
                        {JSON.stringify(action.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!lastResult && !error && !isLoading && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Enter a goal and click "Run Goal" to test the AI agent
            </div>
          )}
        </>
      )}
    </div>
  );
}
