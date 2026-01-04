import { create } from "zustand";
import alasql from "alasql";
import type { Task, Person, Milestone, Tag, TaskStatus } from "@/types";

interface ProjectState {
  tasks: Task[];
  people: Person[];
  milestones: Milestone[];
  tags: Tag[];
  nextTaskId: number;
}

/** Result of a SQL query */
export type QueryResult<T = unknown> = {
  success: true;
  data: T[];
} | {
  success: false;
  error: string;
};

interface ProjectActions {
  // === Mutation Actions ===
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: Task["id"]) => void;
  moveTask: (taskId: Task["id"], newStatus: TaskStatus) => void;
  addAssignee: (taskId: Task["id"], personId: Person["id"]) => void;
  removeAssignee: (taskId: Task["id"], personId: Person["id"]) => void;
  addPerson: (person: Omit<Person, "id">) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: Person["id"]) => void;
  addMilestone: (milestone: Omit<Milestone, "id">) => void;
  updateMilestone: (milestone: Milestone) => void;
  deleteMilestone: (id: Milestone["id"]) => void;
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (id: Tag["id"]) => void;

  // === Query Actions ===
  getTasksByStatus: (status: TaskStatus) => Task[];
  getPersonById: (id: Person["id"]) => Person | undefined;
  getMilestoneById: (id: Milestone["id"]) => Milestone | undefined;
  getTagById: (id: Tag["id"]) => Tag | undefined;
  getTaskDependencies: (task: Task) => Task[];

  /**
   * Execute a SQL query against the project state.
   *
   * Use `?` placeholders for table references. Tables are passed in this order:
   * - `?` or `$0`: tasks
   * - `$1`: people
   * - `$2`: milestones
   * - `$3`: tags
   * - `$4`: task_assignees (taskId, personId)
   * - `$5`: task_tags (taskId, tagId)
   * - `$6`: task_dependencies (taskId, dependsOnTaskId)
   *
   * @example
   * // Get all todo tasks
   * query("SELECT * FROM ? WHERE status = 'todo'")
   *
   * // Get tasks with their assignee names
   * query(`
   *   SELECT t.id, t.title, p.name as assignee
   *   FROM ? t
   *   JOIN $4 ta ON t.id = ta.taskId
   *   JOIN $1 p ON ta.personId = p.id
   * `)
   *
   * // Count tasks by status
   * query("SELECT status, COUNT(*) as count FROM ? GROUP BY status")
   *
   * // Get unassigned tasks
   * query("SELECT * FROM ? WHERE ARRAY_LENGTH(assigneeIds) = 0")
   */
  query: <T = unknown>(sql: string) => QueryResult<T>;
}

type ProjectStore = ProjectState & ProjectActions;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Demo data
const demoPeople: Person[] = [
  {
    id: "p1",
    name: "Dragan Okanovic",
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1482453058567258113/_ECl3eS7_400x400.png",
  },
  { id: "p2", name: "Bob Martinez" },
  { id: "p3", name: "Carol Johnson" },
  { id: "p4", name: "David Kim" },
];

const demoTags: Tag[] = [
  { id: "t1", name: "bug", color: "#ef4444" },
  { id: "t2", name: "feature", color: "#22c55e" },
  { id: "t3", name: "documentation", color: "#3b82f6" },
  { id: "t4", name: "urgent", color: "#f97316" },
  { id: "t5", name: "design", color: "#8b5cf6" },
  { id: "t6", name: "backend", color: "#14b8a6" },
];

const demoMilestones: Milestone[] = [
  {
    id: "m1",
    name: "v1.0 Launch",
    description: "Initial public release",
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-01-31T00:00:00.000Z",
  },
  {
    id: "m2",
    name: "v1.1 Improvements",
    description: "Bug fixes and performance improvements",
    startDate: "2025-02-01T00:00:00.000Z",
    endDate: "2025-02-28T00:00:00.000Z",
  },
];

const now = new Date().toISOString();
const demoTasks: Task[] = [
  {
    id: 1,
    title: "Research competitor features",
    description: "Analyze top 5 competitors and document their key features",
    status: "done",
    storyPoints: 3,
    assigneeIds: ["p1"],
    dependencyIds: [],
    tagIds: ["t3"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    title: "Design system architecture",
    description: "Create high-level architecture diagrams and technical spec",
    status: "done",
    storyPoints: 8,
    assigneeIds: ["p2", "p4"],
    dependencyIds: [1],
    tagIds: ["t5", "t6"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 3,
    title: "Set up CI/CD pipeline",
    description:
      "Configure GitHub Actions for automated testing and deployment",
    status: "in_review",
    storyPoints: 5,
    assigneeIds: ["p4"],
    dependencyIds: [],
    tagIds: ["t6"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 4,
    title: "Implement user authentication",
    description: "Add login, signup, and password reset functionality",
    status: "in_progress",
    storyPoints: 13,
    assigneeIds: ["p2"],
    dependencyIds: [2],
    tagIds: ["t2", "t6"],
    milestoneId: "m1",
    endDate: "2025-01-15T00:00:00.000Z",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 5,
    title: "Create landing page",
    description: "Design and implement the marketing landing page",
    status: "in_progress",
    storyPoints: 5,
    assigneeIds: ["p3"],
    dependencyIds: [],
    tagIds: ["t2", "t5"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 6,
    title: "Fix login button not responding",
    description:
      "Users report the login button sometimes doesn't work on mobile",
    status: "todo",
    storyPoints: 2,
    assigneeIds: ["p2"],
    dependencyIds: [4],
    tagIds: ["t1", "t4"],
    milestoneId: "m1",
    endDate: "2025-01-10T00:00:00.000Z",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 7,
    title: "Write API documentation",
    description: "Document all REST endpoints with examples",
    status: "todo",
    storyPoints: 3,
    assigneeIds: ["p1"],
    dependencyIds: [4],
    tagIds: ["t3"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 8,
    title: "Add dark mode support",
    description: "Implement theme switching with system preference detection",
    status: "todo",
    storyPoints: 5,
    assigneeIds: [],
    dependencyIds: [],
    tagIds: ["t2", "t5"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 9,
    title: "Database schema review",
    description: "Review and optimize database indexes for better performance",
    status: "backlog",
    storyPoints: 3,
    assigneeIds: ["p4"],
    dependencyIds: [],
    tagIds: ["t6"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 10,
    title: "Add export to CSV feature",
    description: "Allow users to export their data as CSV files",
    status: "backlog",
    storyPoints: 5,
    assigneeIds: [],
    dependencyIds: [],
    tagIds: ["t2"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 11,
    title: "Implement email notifications",
    description: "Send email alerts for important events",
    status: "backlog",
    storyPoints: 8,
    assigneeIds: [],
    dependencyIds: [4],
    tagIds: ["t2", "t6"],
    createdAt: now,
    updatedAt: now,
  },
];

export const useProjectStore = create<ProjectStore>((set, get) => ({
  tasks: demoTasks,
  people: demoPeople,
  milestones: demoMilestones,
  tags: demoTags,
  nextTaskId: 12,

  addTask: (task) => {
    const now = new Date().toISOString();
    set((state) => ({
      tasks: [
        ...state.tasks,
        { ...task, id: state.nextTaskId, createdAt: now, updatedAt: now },
      ],
      nextTaskId: state.nextTaskId + 1,
    }));
  },

  updateTask: (task) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  moveTask: (taskId, newStatus) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
  },

  addAssignee: (taskId, personId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId && !t.assigneeIds.includes(personId)
          ? {
              ...t,
              assigneeIds: [...t.assigneeIds, personId],
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
  },

  removeAssignee: (taskId, personId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assigneeIds: t.assigneeIds.filter((id) => id !== personId),
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
  },

  addPerson: (person) => {
    set((state) => ({
      people: [...state.people, { ...person, id: generateId() }],
    }));
  },

  updatePerson: (person) => {
    set((state) => ({
      people: state.people.map((p) => (p.id === person.id ? person : p)),
    }));
  },

  deletePerson: (id) => {
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
      tasks: state.tasks.map((t) => ({
        ...t,
        assigneeIds: t.assigneeIds.filter((aid) => aid !== id),
      })),
    }));
  },

  addMilestone: (milestone) => {
    set((state) => ({
      milestones: [...state.milestones, { ...milestone, id: generateId() }],
    }));
  },

  updateMilestone: (milestone) => {
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === milestone.id ? milestone : m
      ),
    }));
  },

  deleteMilestone: (id) => {
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
      tasks: state.tasks.map((t) =>
        t.milestoneId === id ? { ...t, milestoneId: undefined } : t
      ),
    }));
  },

  addTag: (tag) => {
    set((state) => ({
      tags: [...state.tags, { ...tag, id: generateId() }],
    }));
  },

  updateTag: (tag) => {
    set((state) => ({
      tags: state.tags.map((t) => (t.id === tag.id ? tag : t)),
    }));
  },

  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
      tasks: state.tasks.map((t) => ({
        ...t,
        tagIds: t.tagIds.filter((tid) => tid !== id),
      })),
    }));
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status);
  },

  getPersonById: (id) => {
    return get().people.find((p) => p.id === id);
  },

  getMilestoneById: (id) => {
    return get().milestones.find((m) => m.id === id);
  },

  getTagById: (id) => {
    return get().tags.find((t) => t.id === id);
  },

  getTaskDependencies: (task) => {
    return get().tasks.filter((t) => task.dependencyIds.includes(t.id));
  },

  query: <T = unknown>(sql: string): QueryResult<T> => {
    try {
      const { tasks, people, milestones, tags } = get();

      // Build junction tables for many-to-many relationships
      const task_assignees: { taskId: number; personId: string }[] = [];
      const task_tags: { taskId: number; tagId: string }[] = [];
      const task_dependencies: {
        taskId: number;
        dependsOnTaskId: number;
      }[] = [];

      for (const task of tasks) {
        for (const personId of task.assigneeIds) {
          task_assignees.push({ taskId: task.id, personId });
        }
        for (const tagId of task.tagIds) {
          task_tags.push({ taskId: task.id, tagId });
        }
        for (const depId of task.dependencyIds) {
          task_dependencies.push({ taskId: task.id, dependsOnTaskId: depId });
        }
      }

      // Execute query with tables passed as positional parameters
      // $0=tasks, $1=people, $2=milestones, $3=tags, $4=task_assignees, $5=task_tags, $6=task_dependencies
      const result = alasql(sql, [
        tasks,
        people,
        milestones,
        tags,
        task_assignees,
        task_tags,
        task_dependencies,
      ]) as T[];

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Query failed",
      };
    }
  },
}));

/**
 * Execute a SQL query against the project state (standalone function).
 * Use this outside of React components.
 */
export function queryProject<T = unknown>(sql: string): QueryResult<T> {
  return useProjectStore.getState().query<T>(sql);
}

// Compatibility wrapper - keeps the same API as before
export function useProject() {
  const store = useProjectStore();
  return {
    state: {
      tasks: store.tasks,
      people: store.people,
      milestones: store.milestones,
      tags: store.tags,
    },
    addTask: store.addTask,
    updateTask: store.updateTask,
    deleteTask: store.deleteTask,
    moveTask: store.moveTask,
    addAssignee: store.addAssignee,
    removeAssignee: store.removeAssignee,
    addPerson: store.addPerson,
    updatePerson: store.updatePerson,
    deletePerson: store.deletePerson,
    addMilestone: store.addMilestone,
    updateMilestone: store.updateMilestone,
    deleteMilestone: store.deleteMilestone,
    addTag: store.addTag,
    updateTag: store.updateTag,
    deleteTag: store.deleteTag,
    getTasksByStatus: store.getTasksByStatus,
    getPersonById: store.getPersonById,
    getMilestoneById: store.getMilestoneById,
    getTagById: store.getTagById,
    getTaskDependencies: store.getTaskDependencies,
    query: store.query,
  };
}
