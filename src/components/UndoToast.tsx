import { type FC } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Undo2 } from "lucide-react";

interface UndoToastProps {
  actionCount: number;
  onUndo: () => void;
}

export const UndoToast: FC<UndoToastProps> = ({ actionCount, onUndo }) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
      <span className="text-sm">
        Executed {actionCount} {actionCount === 1 ? "action" : "actions"}
      </span>
      <Button variant="outline" size="sm" onClick={onUndo} className="ml-auto">
        <Undo2 className="mr-1 h-3 w-3" />
        Undo
      </Button>
    </div>
  );
};
