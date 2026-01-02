import { create } from "zustand";
import { useRef, useCallback, useId, useEffect, type ReactNode } from "react";
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

/** Unique identifier for a target (type + entity id) */
export type TargetKey = {
  type: HoverableType;
  entityId: string | number;
};

/** A recorded hover event with timing */
export type HoverEvent = {
  id: string;
  targetKey: TargetKey;
  startTime: number;
  endTime: number | null;
};

/** Completed hover event (has both start and end times) */
export type CompletedHoverEvent = HoverEvent & { endTime: number };

/** Registered target instance */
type RegisteredTarget = {
  instanceId: string;
  targetKey: TargetKey;
};

type HoverState = {
  /** Currently active hovers (multiple elements can be hovered when stacked) */
  activeHovers: Map<string, HoverEvent>;
  /** History of completed hover events */
  history: CompletedHoverEvent[];
  /** All registered hover target instances */
  registeredTargets: Map<string, RegisteredTarget>;
};

type HoverActions = {
  /** Start tracking a hover event */
  startHover: (hoverId: string, payload: HoverPayload) => void;
  /** End a specific hover event by ID */
  endHover: (hoverId: string) => void;
  /** Clear all hover history */
  clearHistory: () => void;
  /** Register a hover target instance */
  registerTarget: (instanceId: string, targetKey: TargetKey) => void;
  /** Unregister a hover target instance */
  unregisterTarget: (instanceId: string) => void;
  /** Check if a target key matches any active hover */
  isTargetActive: (targetKey: TargetKey) => boolean;
};

type HoverStore = HoverState & HoverActions;

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a target key from a payload */
function payloadToTargetKey(payload: HoverPayload): TargetKey {
  if (payload.type === "status") {
    return { type: "status", entityId: payload.data };
  }
  return { type: payload.type, entityId: payload.data.id };
}

/** Check if two target keys match */
function targetKeysMatch(a: TargetKey, b: TargetKey): boolean {
  return a.type === b.type && a.entityId === b.entityId;
}

export const useHoverStore = create<HoverStore>((set, get) => ({
  activeHovers: new Map(),
  history: [],
  registeredTargets: new Map(),

  startHover: (hoverId, payload) => {
    const targetKey = payloadToTargetKey(payload);

    set((state) => {
      const newMap = new Map(state.activeHovers);
      newMap.set(hoverId, {
        id: generateEventId(),
        targetKey,
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

  registerTarget: (instanceId, targetKey) => {
    set((state) => {
      const newMap = new Map(state.registeredTargets);
      newMap.set(instanceId, { instanceId, targetKey });
      return { registeredTargets: newMap };
    });
  },

  unregisterTarget: (instanceId) => {
    set((state) => {
      const newMap = new Map(state.registeredTargets);
      newMap.delete(instanceId);
      return { registeredTargets: newMap };
    });
  },

  isTargetActive: (targetKey) => {
    const { activeHovers } = get();
    for (const hover of activeHovers.values()) {
      if (targetKeysMatch(hover.targetKey, targetKey)) {
        return true;
      }
    }
    return false;
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
 * All instances with the same target (type + id) will highlight together
 * when ANY instance of that target is hovered.
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
  const { startHover, endHover, registerTarget, unregisterTarget } =
    useHoverStore();
  // Subscribe to activeHovers to re-render when it changes
  const activeHovers = useHoverStore((state) => state.activeHovers);

  const instanceId = useId();
  const isHovering = useRef(false);

  const targetKey = payloadToTargetKey(payload);

  // Check if this target matches any active hover
  const isHighlighted = (() => {
    for (const hover of activeHovers.values()) {
      if (targetKeysMatch(hover.targetKey, targetKey)) {
        return true;
      }
    }
    return false;
  })();

  // Register on mount, unregister on unmount
  useEffect(() => {
    registerTarget(instanceId, targetKey);
    return () => {
      unregisterTarget(instanceId);
    };
  }, [
    instanceId,
    targetKey.type,
    targetKey.entityId,
    registerTarget,
    unregisterTarget,
  ]);

  const handleMouseEnter = useCallback(() => {
    if (disabled || isHovering.current) {
      return;
    }
    isHovering.current = true;
    startHover(instanceId, payload);
  }, [disabled, instanceId, payload, startHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isHovering.current) {
      return;
    }
    isHovering.current = false;
    endHover(instanceId);
  }, [endHover, instanceId]);

  return (
    <span
      className={cn(
        "relative inline-block transition-shadow",
        isHighlighted && "ring-2 ring-primary ring-offset-1",
        className
      )}
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
  const registeredTargets = useHoverStore((state) => state.registeredTargets);
  const clearHistory = useHoverStore((state) => state.clearHistory);

  const hoversArray = Array.from(activeHovers.values());

  // Count unique targets by type+id
  const uniqueTargets = new Map<string, { key: TargetKey; count: number }>();
  for (const target of registeredTargets.values()) {
    const keyStr = `${target.targetKey.type}:${target.targetKey.entityId}`;
    const existing = uniqueTargets.get(keyStr);
    if (existing) {
      existing.count++;
    } else {
      uniqueTargets.set(keyStr, { key: target.targetKey, count: 1 });
    }
  }

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
                    TYPE_COLORS[hover.targetKey.type]
                  )}
                >
                  {hover.targetKey.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hover.targetKey.entityId}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Registered: {uniqueTargets.size} unique targets</span>
          <span>({registeredTargets.size} instances)</span>
        </div>
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

/** Hook to check if a specific target is currently being hovered (anywhere) */
export function useIsTargetActive(payload: HoverPayload): boolean {
  const activeHovers = useHoverStore((state) => state.activeHovers);
  const targetKey = payloadToTargetKey(payload);

  for (const hover of activeHovers.values()) {
    if (targetKeysMatch(hover.targetKey, targetKey)) {
      return true;
    }
  }
  return false;
}

/** Hook to get all registered targets */
export function useRegisteredTargets() {
  return useHoverStore((state) =>
    Array.from(state.registeredTargets.values())
  );
}

// Export utility functions
export { payloadToTargetKey, targetKeysMatch };
