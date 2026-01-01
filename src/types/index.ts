export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeIds: string[]; // References to Person.id
  dependencyIds: string[]; // References to other Task.id
  tagIds: string[]; // References to Tag.id
  milestoneId?: string; // Reference to Milestone.id
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string (due date)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string }
> = {
  backlog: { label: "Backlog", color: "bg-gray-100 text-gray-800" },
  todo: { label: "To Do", color: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  in_review: { label: "In Review", color: "bg-purple-100 text-purple-800" },
  done: { label: "Done", color: "bg-green-100 text-green-800" },
};

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];
