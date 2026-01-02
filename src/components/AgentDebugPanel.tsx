import { useState, type FormEvent } from "react";
import { useProjectAgent } from "@/components/ai-agent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Play, Loader2, CheckCircle, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_GOALS = [
  "List all people and their current workload",
  "Find all unassigned tasks and assign them to the person with the least tasks",
  "Move all 'todo' tasks with the 'urgent' tag to 'in_progress'",
  "Create a new task called 'Code Review' and assign it to the first available person",
];

export function AgentDebugPanel() {
  const [goal, setGoal] = useState(SAMPLE_GOALS[0]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { isLoading, error, lastResult, runGoal, executeLastResult } =
    useProjectAgent();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) {
      return;
    }
    await runGoal(goal.trim());
  };

  const handleExecute = () => {
    executeLastResult();
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur transition-all",
        isExpanded ? "w-96" : "w-auto"
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
              <select
                className="rounded border border-input bg-background px-2 text-xs"
                onChange={(e) => setGoal(e.target.value)}
                value=""
              >
                <option value="" disabled>
                  Samples
                </option>
                {SAMPLE_GOALS.map((g, i) => (
                  <option key={i} value={g}>
                    {g.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 border-b border-border bg-destructive/10 p-3 text-xs text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="line-clamp-2">{error}</span>
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
                  <div className="rounded bg-muted p-2 text-xs">
                    {lastResult.reasoning.slice(0, 300)}
                    {lastResult.reasoning.length > 300 && "..."}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Actions ({lastResult.actions.length})
                </span>
                {lastResult.actions.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleExecute}
                    className="h-6 text-xs"
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Execute All
                  </Button>
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
                      <pre className="mt-1 overflow-auto text-[10px] text-muted-foreground">
                        {JSON.stringify(action.payload, null, 2).slice(0, 200)}
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
