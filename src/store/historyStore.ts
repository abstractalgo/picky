import { create } from "zustand";
import type { Task, Person, Milestone, Tag } from "@/types";
import { useProjectStore } from "./ProjectContext";
import type { AgentAction } from "../components/ai-agent";

/** Snapshot of the entire project state */
export interface StateSnapshot {
  tasks: Task[];
  people: Person[];
  milestones: Milestone[];
  tags: Tag[];
  nextTaskId: number;
}

/** A recorded history entry */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  actions: AgentAction[];
  snapshotBefore: StateSnapshot;
}

interface HistoryState {
  entries: HistoryEntry[];
  maxEntries: number;
}

interface HistoryActions {
  /** Capture current state and store as snapshot before executing actions */
  captureSnapshot: (actions: AgentAction[], description?: string) => string;

  /** Undo a specific entry by ID (restores snapshot) */
  undo: (entryId: string) => boolean;

  /** Undo the most recent entry */
  undoLast: () => boolean;

  /** Clear all history */
  clearHistory: () => void;

  /** Get entry by ID */
  getEntry: (id: string) => HistoryEntry | undefined;
}

type HistoryStore = HistoryState & HistoryActions;

function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function captureCurrentState(): StateSnapshot {
  const { tasks, people, milestones, tags, nextTaskId } =
    useProjectStore.getState();
  return {
    tasks: structuredClone(tasks),
    people: structuredClone(people),
    milestones: structuredClone(milestones),
    tags: structuredClone(tags),
    nextTaskId,
  };
}

function restoreState(snapshot: StateSnapshot): void {
  useProjectStore.setState({
    tasks: snapshot.tasks,
    people: snapshot.people,
    milestones: snapshot.milestones,
    tags: snapshot.tags,
    nextTaskId: snapshot.nextTaskId,
  });
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  maxEntries: 50,

  captureSnapshot: (actions, description = "Agent actions") => {
    const id = generateId();
    const entry: HistoryEntry = {
      id,
      timestamp: Date.now(),
      description,
      actions,
      snapshotBefore: captureCurrentState(),
    };

    set((state) => {
      const newEntries = [entry, ...state.entries].slice(0, state.maxEntries);
      return { entries: newEntries };
    });

    return id;
  },

  undo: (entryId) => {
    const entry = get().entries.find((e) => e.id === entryId);
    if (!entry) {
      return false;
    }

    restoreState(entry.snapshotBefore);

    // Remove this entry and all entries after it (more recent)
    set((state) => ({
      entries: state.entries.filter((e) => e.timestamp < entry.timestamp),
    }));

    return true;
  },

  undoLast: () => {
    const { entries } = get();
    if (entries.length === 0) {
      return false;
    }
    return get().undo(entries[0].id);
  },

  clearHistory: () => set({ entries: [] }),

  getEntry: (id) => get().entries.find((e) => e.id === id),
}));
