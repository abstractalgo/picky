import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useCallback,
} from "react";
import type { Task, Person, Milestone, Tag, TaskStatus } from "@/types";

interface ProjectState {
  tasks: Task[];
  people: Person[];
  milestones: Milestone[];
  tags: Tag[];
}

type ProjectAction =
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "MOVE_TASK"; payload: { taskId: string; newStatus: TaskStatus } }
  | { type: "ADD_PERSON"; payload: Person }
  | { type: "UPDATE_PERSON"; payload: Person }
  | { type: "DELETE_PERSON"; payload: string }
  | { type: "ADD_MILESTONE"; payload: Milestone }
  | { type: "UPDATE_MILESTONE"; payload: Milestone }
  | { type: "DELETE_MILESTONE"; payload: string }
  | { type: "ADD_TAG"; payload: Tag }
  | { type: "UPDATE_TAG"; payload: Tag }
  | { type: "DELETE_TAG"; payload: string };

function projectReducer(
  state: ProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
      };
    case "MOVE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? {
                ...t,
                status: action.payload.newStatus,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      };
    case "ADD_PERSON":
      return { ...state, people: [...state.people, action.payload] };
    case "UPDATE_PERSON":
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PERSON":
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.payload),
        tasks: state.tasks.map((t) => ({
          ...t,
          assigneeIds: t.assigneeIds.filter((id) => id !== action.payload),
        })),
      };
    case "ADD_MILESTONE":
      return { ...state, milestones: [...state.milestones, action.payload] };
    case "UPDATE_MILESTONE":
      return {
        ...state,
        milestones: state.milestones.map((m) =>
          m.id === action.payload.id ? action.payload : m
        ),
      };
    case "DELETE_MILESTONE":
      return {
        ...state,
        milestones: state.milestones.filter((m) => m.id !== action.payload),
        tasks: state.tasks.map((t) =>
          t.milestoneId === action.payload ? { ...t, milestoneId: undefined } : t
        ),
      };
    case "ADD_TAG":
      return { ...state, tags: [...state.tags, action.payload] };
    case "UPDATE_TAG":
      return {
        ...state,
        tags: state.tags.map((tag) =>
          tag.id === action.payload.id ? action.payload : tag
        ),
      };
    case "DELETE_TAG":
      return {
        ...state,
        tags: state.tags.filter((tag) => tag.id !== action.payload),
        tasks: state.tasks.map((t) => ({
          ...t,
          tagIds: t.tagIds.filter((id) => id !== action.payload),
        })),
      };
    default:
      return state;
  }
}

// Demo data
const demoPeople: Person[] = [
  { id: "p1", name: "Alice Chen", email: "alice@example.com" },
  { id: "p2", name: "Bob Martinez", email: "bob@example.com" },
  { id: "p3", name: "Carol Johnson", email: "carol@example.com" },
  { id: "p4", name: "David Kim", email: "david@example.com" },
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
    id: "task1",
    title: "Research competitor features",
    description: "Analyze top 5 competitors and document their key features",
    status: "done",
    assigneeIds: ["p1"],
    dependencyIds: [],
    tagIds: ["t3"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task2",
    title: "Design system architecture",
    description: "Create high-level architecture diagrams and technical spec",
    status: "done",
    assigneeIds: ["p2", "p4"],
    dependencyIds: ["task1"],
    tagIds: ["t5", "t6"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task3",
    title: "Set up CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment",
    status: "in_review",
    assigneeIds: ["p4"],
    dependencyIds: [],
    tagIds: ["t6"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task4",
    title: "Implement user authentication",
    description: "Add login, signup, and password reset functionality",
    status: "in_progress",
    assigneeIds: ["p2"],
    dependencyIds: ["task2"],
    tagIds: ["t2", "t6"],
    milestoneId: "m1",
    endDate: "2025-01-15T00:00:00.000Z",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task5",
    title: "Create landing page",
    description: "Design and implement the marketing landing page",
    status: "in_progress",
    assigneeIds: ["p3"],
    dependencyIds: [],
    tagIds: ["t2", "t5"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task6",
    title: "Fix login button not responding",
    description: "Users report the login button sometimes doesn't work on mobile",
    status: "todo",
    assigneeIds: ["p2"],
    dependencyIds: ["task4"],
    tagIds: ["t1", "t4"],
    milestoneId: "m1",
    endDate: "2025-01-10T00:00:00.000Z",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task7",
    title: "Write API documentation",
    description: "Document all REST endpoints with examples",
    status: "todo",
    assigneeIds: ["p1"],
    dependencyIds: ["task4"],
    tagIds: ["t3"],
    milestoneId: "m1",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task8",
    title: "Add dark mode support",
    description: "Implement theme switching with system preference detection",
    status: "todo",
    assigneeIds: [],
    dependencyIds: [],
    tagIds: ["t2", "t5"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task9",
    title: "Database schema review",
    description: "Review and optimize database indexes for better performance",
    status: "backlog",
    assigneeIds: ["p4"],
    dependencyIds: [],
    tagIds: ["t6"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task10",
    title: "Add export to CSV feature",
    description: "Allow users to export their data as CSV files",
    status: "backlog",
    assigneeIds: [],
    dependencyIds: [],
    tagIds: ["t2"],
    milestoneId: "m2",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task11",
    title: "Implement email notifications",
    description: "Send email alerts for important events",
    status: "backlog",
    assigneeIds: [],
    dependencyIds: ["task4"],
    tagIds: ["t2", "t6"],
    createdAt: now,
    updatedAt: now,
  },
];

const initialState: ProjectState = {
  tasks: demoTasks,
  people: demoPeople,
  milestones: demoMilestones,
  tags: demoTags,
};

interface ProjectContextValue {
  state: ProjectState;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  addPerson: (person: Omit<Person, "id">) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  addMilestone: (milestone: Omit<Milestone, "id">) => void;
  updateMilestone: (milestone: Milestone) => void;
  deleteMilestone: (id: string) => void;
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getPersonById: (id: string) => Person | undefined;
  getMilestoneById: (id: string) => Milestone | undefined;
  getTagById: (id: string) => Tag | undefined;
  getTaskDependencies: (task: Task) => Task[];
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const addTask = useCallback(
    (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      dispatch({
        type: "ADD_TASK",
        payload: { ...task, id: generateId(), createdAt: now, updatedAt: now },
      });
    },
    []
  );

  const updateTask = useCallback((task: Task) => {
    dispatch({
      type: "UPDATE_TASK",
      payload: { ...task, updatedAt: new Date().toISOString() },
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: "DELETE_TASK", payload: id });
  }, []);

  const moveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
    dispatch({ type: "MOVE_TASK", payload: { taskId, newStatus } });
  }, []);

  const addPerson = useCallback((person: Omit<Person, "id">) => {
    dispatch({
      type: "ADD_PERSON",
      payload: { ...person, id: generateId() },
    });
  }, []);

  const updatePerson = useCallback((person: Person) => {
    dispatch({ type: "UPDATE_PERSON", payload: person });
  }, []);

  const deletePerson = useCallback((id: string) => {
    dispatch({ type: "DELETE_PERSON", payload: id });
  }, []);

  const addMilestone = useCallback((milestone: Omit<Milestone, "id">) => {
    dispatch({
      type: "ADD_MILESTONE",
      payload: { ...milestone, id: generateId() },
    });
  }, []);

  const updateMilestone = useCallback((milestone: Milestone) => {
    dispatch({ type: "UPDATE_MILESTONE", payload: milestone });
  }, []);

  const deleteMilestone = useCallback((id: string) => {
    dispatch({ type: "DELETE_MILESTONE", payload: id });
  }, []);

  const addTag = useCallback((tag: Omit<Tag, "id">) => {
    dispatch({
      type: "ADD_TAG",
      payload: { ...tag, id: generateId() },
    });
  }, []);

  const updateTag = useCallback((tag: Tag) => {
    dispatch({ type: "UPDATE_TAG", payload: tag });
  }, []);

  const deleteTag = useCallback((id: string) => {
    dispatch({ type: "DELETE_TAG", payload: id });
  }, []);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => state.tasks.filter((t) => t.status === status),
    [state.tasks]
  );

  const getPersonById = useCallback(
    (id: string) => state.people.find((p) => p.id === id),
    [state.people]
  );

  const getMilestoneById = useCallback(
    (id: string) => state.milestones.find((m) => m.id === id),
    [state.milestones]
  );

  const getTagById = useCallback(
    (id: string) => state.tags.find((t) => t.id === id),
    [state.tags]
  );

  const getTaskDependencies = useCallback(
    (task: Task) =>
      state.tasks.filter((t) => task.dependencyIds.includes(t.id)),
    [state.tasks]
  );

  return (
    <ProjectContext.Provider
      value={{
        state,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        addPerson,
        updatePerson,
        deletePerson,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        addTag,
        updateTag,
        deleteTag,
        getTasksByStatus,
        getPersonById,
        getMilestoneById,
        getTagById,
        getTaskDependencies,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
