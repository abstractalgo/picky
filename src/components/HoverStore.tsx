import { create } from "zustand";
import { useRef, useCallback, useId, type ReactNode } from "react";
import type { Person, Task, Milestone, Tag } from "@/types";
import { cn } from "@/lib/utils";

/** Types of entities that can be hovered */
export type HoverableType = "person" | "task" | "milestone" | "tag" | "status";

/** Payload for each hoverable type */
export type HoverPayload =
  | { type: "person"; data: Person }
  | { type: "task"; data: Task }
  | { type: "milestone"; data: Milestone }
  | { type: "tag"; data: Tag }
  | { type: "status"; data: Task["status"] };

/** A recorded hover event with timing */
export type HoverEvent = {
  id: string;
  payload: HoverPayload;
  startTime: number;
  endTime: number | null;
};

/** Completed hover event (has both start and end times) */
export type CompletedHoverEvent = HoverEvent & { endTime: number };

type HoverState = {
  /** Currently active hovers (multiple elements can be hovered when stacked) */
  activeHovers: Map<string, HoverEvent>;
  /** History of completed hover events */
  history: CompletedHoverEvent[];
};

type HoverActions = {
  /** Start tracking a hover event, returns the hover ID */
  startHover: (hoverId: string, payload: HoverPayload) => void;
  /** End a specific hover event by ID */
  endHover: (hoverId: string) => void;
  /** Clear all hover history */
  clearHistory: () => void;
  /** Get hover events for a specific entity */
  getHoverEventsFor: (
    type: HoverableType,
    id: string | number
  ) => CompletedHoverEvent[];
  /** Get total hover duration for a specific entity (in ms) */
  getTotalHoverDuration: (type: HoverableType, id: string | number) => number;
};

type HoverStore = HoverState & HoverActions;

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getEntityId(payload: HoverPayload): string | number {
  if (payload.type === "status") {
    return payload.data;
  }
  return payload.data.id;
}

function getEntityLabel(payload: HoverPayload): string {
  switch (payload.type) {
    case "person":
      return payload.data.name;
    case "task":
      return `#${payload.data.id} ${payload.data.title}`;
    case "milestone":
      return payload.data.name;
    case "tag":
      return payload.data.name;
    case "status":
      return payload.data;
  }
}

export const useHoverStore = create<HoverStore>((set, get) => ({
  activeHovers: new Map(),
  history: [],

  startHover: (hoverId, payload) => {
    set((state) => {
      const newMap = new Map(state.activeHovers);
      newMap.set(hoverId, {
        id: generateEventId(),
        payload,
        startTime: Date.now(),
        endTime: null,
      });
      return { activeHovers: newMap };
    });
  },

  endHover: (hoverId) => {
    const current = get().activeHovers.get(hoverId);
    if (!current) {
      return;
    }

    const completed: CompletedHoverEvent = {
      ...current,
      endTime: Date.now(),
    };

    set((state) => {
      const newMap = new Map(state.activeHovers);
      newMap.delete(hoverId);
      return {
        activeHovers: newMap,
        history: [...state.history, completed],
      };
    });
  },

  clearHistory: () => {
    set({ history: [] });
  },

  getHoverEventsFor: (type, id) => {
    return get().history.filter(
      (event) =>
        event.payload.type === type && getEntityId(event.payload) === id
    );
  },

  getTotalHoverDuration: (type, id) => {
    const events = get().getHoverEventsFor(type, id);
    return events.reduce((total, event) => {
      return total + (event.endTime - event.startTime);
    }, 0);
  },
}));

// ============================================================================
// HoverTarget Component
// ============================================================================

type HoverTargetProps = {
  /** The payload describing what's being hovered */
  payload: HoverPayload;
  /** Children to render */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Whether hover tracking is disabled */
  disabled?: boolean;
};

/**
 * Wraps an element to track hover events with timestamps.
 * Supports multiple simultaneous hovers for stacked elements.
 *
 * @example
 * ```tsx
 * <HoverTarget payload={{ type: "person", data: person }}>
 *   <Avatar src={person.avatarUrl} />
 * </HoverTarget>
 * ```
 */
export function HoverTarget({
  payload,
  children,
  className,
  disabled = false,
}: HoverTargetProps) {
  const { startHover, endHover } = useHoverStore();
  const hoverId = useId();
  const isHovering = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (disabled || isHovering.current) {
      return;
    }
    isHovering.current = true;
    startHover(hoverId, payload);
  }, [disabled, hoverId, payload, startHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isHovering.current) {
      return;
    }
    isHovering.current = false;
    endHover(hoverId);
  }, [endHover, hoverId]);

  return (
    <span
      className={cn(className, "relative inline-block hover:ring-2 ring-red-500")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Debug Panel
// ============================================================================

const TYPE_COLORS: Record<HoverableType, string> = {
  person: "bg-blue-500",
  task: "bg-green-500",
  milestone: "bg-purple-500",
  tag: "bg-orange-500",
  status: "bg-gray-500",
};

/**
 * Floating debug panel that shows all currently hovered elements.
 * Useful for debugging hover tracking.
 */
export function HoverDebugPanel() {
  const activeHovers = useHoverStore((state) => state.activeHovers);
  const history = useHoverStore((state) => state.history);
  const clearHistory = useHoverStore((state) => state.clearHistory);

  const hoversArray = Array.from(activeHovers.values());

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur">
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Hover Debug</h3>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {hoversArray.length} active
          </span>
        </div>
      </div>

      <div className="max-h-64 overflow-auto p-3">
        {hoversArray.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            Hover over elements to see them here
          </p>
        ) : (
          <div className="space-y-2">
            {hoversArray.map((hover) => (
              <div
                key={hover.id}
                className="flex items-center gap-2 rounded border border-border p-2"
              >
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white",
                    TYPE_COLORS[hover.payload.type]
                  )}
                >
                  {hover.payload.type}
                </span>
                <span className="min-w-0 truncate text-xs">
                  {getEntityLabel(hover.payload)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>History: {history.length} events</span>
          <button
            onClick={clearHistory}
            className="text-destructive hover:underline"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Hooks
// ============================================================================

/** Hook to get all currently hovered items */
export function useActiveHovers() {
  return useHoverStore((state) => Array.from(state.activeHovers.values()));
}

/** Hook to get hover history */
export function useHoverHistory() {
  return useHoverStore((state) => state.history);
}

/** Hook to get hover stats for a specific entity */
export function useHoverStats(type: HoverableType, id: string | number) {
  const store = useHoverStore();
  return {
    events: store.getHoverEventsFor(type, id),
    totalDuration: store.getTotalHoverDuration(type, id),
  };
}
