import Anthropic from "@anthropic-ai/sdk";
import type { Task, Person, Milestone, Tag, TaskStatus } from "@/types";
import { useProjectStore } from "@/store/ProjectContext";
import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

/** The current state snapshot passed to the agent */
export type ProjectSnapshot = {
  tasks: Task[];
  people: Person[];
  milestones: Milestone[];
  tags: Tag[];
};

/** All possible action types the agent can take */
export type AgentActionType =
  | "addTask"
  | "updateTask"
  | "deleteTask"
  | "moveTask"
  | "addPerson"
  | "updatePerson"
  | "deletePerson"
  | "addMilestone"
  | "updateMilestone"
  | "deleteMilestone"
  | "addTag"
  | "updateTag"
  | "deleteTag";

/** Action payloads for each action type */
export type AgentAction =
  | { type: "addTask"; payload: Omit<Task, "id" | "createdAt" | "updatedAt"> }
  | { type: "updateTask"; payload: Task }
  | { type: "deleteTask"; payload: { id: number } }
  | { type: "moveTask"; payload: { taskId: number; newStatus: TaskStatus } }
  | { type: "addPerson"; payload: Omit<Person, "id"> }
  | { type: "updatePerson"; payload: Person }
  | { type: "deletePerson"; payload: { id: string } }
  | { type: "addMilestone"; payload: Omit<Milestone, "id"> }
  | { type: "updateMilestone"; payload: Milestone }
  | { type: "deleteMilestone"; payload: { id: string } }
  | { type: "addTag"; payload: Omit<Tag, "id"> }
  | { type: "updateTag"; payload: Tag }
  | { type: "deleteTag"; payload: { id: string } };

/** Result from the agent */
export type AgentResult = {
  reasoning: string;
  actions: AgentAction[];
};

// ============================================================================
// Tool Definitions for Claude
// ============================================================================

const TASK_STATUS_VALUES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

const tools: Anthropic.Tool[] = [
  {
    name: "addTask",
    description:
      "Create a new task in the project. Use this to add new work items, bugs, features, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "The title of the task",
        },
        description: {
          type: "string",
          description: "Detailed description of the task",
        },
        status: {
          type: "string",
          enum: TASK_STATUS_VALUES,
          description: "The initial status of the task",
        },
        storyPoints: {
          type: "number",
          description: "Estimated effort in story points (1, 2, 3, 5, 8, 13)",
        },
        assigneeIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of person IDs to assign to this task",
        },
        tagIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of tag IDs to apply to this task",
        },
        milestoneId: {
          type: "string",
          description: "The milestone ID this task belongs to",
        },
        dependencyIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of task IDs this task depends on",
        },
        startDate: {
          type: "string",
          description: "ISO date string for when work should start",
        },
        endDate: {
          type: "string",
          description: "ISO date string for the due date",
        },
      },
      required: ["title", "status", "assigneeIds", "tagIds", "dependencyIds"],
    },
  },
  {
    name: "updateTask",
    description:
      "Update an existing task. You must provide the complete task object with all fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "The task ID to update" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: TASK_STATUS_VALUES },
        storyPoints: { type: "number" },
        assigneeIds: { type: "array", items: { type: "string" } },
        tagIds: { type: "array", items: { type: "string" } },
        milestoneId: { type: "string" },
        dependencyIds: { type: "array", items: { type: "number" } },
        startDate: { type: "string" },
        endDate: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: [
        "id",
        "title",
        "status",
        "assigneeIds",
        "tagIds",
        "dependencyIds",
        "createdAt",
        "updatedAt",
      ],
    },
  },
  {
    name: "deleteTask",
    description: "Delete a task by its ID",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "The task ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "moveTask",
    description: "Move a task to a different status column",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: { type: "number", description: "The task ID to move" },
        newStatus: {
          type: "string",
          enum: TASK_STATUS_VALUES,
          description: "The new status for the task",
        },
      },
      required: ["taskId", "newStatus"],
    },
  },
  {
    name: "addPerson",
    description: "Add a new team member to the project",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The person's full name" },
        avatarUrl: {
          type: "string",
          description: "URL to the person's avatar image",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "updatePerson",
    description: "Update an existing person's information",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The person's ID" },
        name: { type: "string", description: "The person's full name" },
        avatarUrl: { type: "string", description: "URL to avatar image" },
      },
      required: ["id", "name"],
    },
  },
  {
    name: "deletePerson",
    description:
      "Remove a person from the project. They will be unassigned from all tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The person's ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "addMilestone",
    description: "Create a new milestone for organizing tasks",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The milestone name" },
        description: {
          type: "string",
          description: "Description of the milestone",
        },
        startDate: {
          type: "string",
          description: "ISO date string for milestone start",
        },
        endDate: {
          type: "string",
          description: "ISO date string for milestone end",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "updateMilestone",
    description: "Update an existing milestone",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The milestone ID" },
        name: { type: "string" },
        description: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["id", "name"],
    },
  },
  {
    name: "deleteMilestone",
    description:
      "Delete a milestone. Tasks in this milestone will become unassigned.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The milestone ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "addTag",
    description: "Create a new tag for categorizing tasks",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The tag name" },
        color: {
          type: "string",
          description: "Hex color code for the tag (e.g., #ef4444)",
        },
      },
      required: ["name", "color"],
    },
  },
  {
    name: "updateTag",
    description: "Update an existing tag",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The tag ID" },
        name: { type: "string" },
        color: { type: "string" },
      },
      required: ["id", "name", "color"],
    },
  },
  {
    name: "deleteTag",
    description: "Delete a tag. It will be removed from all tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The tag ID to delete" },
      },
      required: ["id"],
    },
  },
];

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(snapshot: ProjectSnapshot): string {
  return `You are an AI assistant that helps manage a project management application (like Jira or Trello).

You have access to tools that allow you to create, update, delete, and organize:
- Tasks (work items with status, assignees, tags, etc.)
- People (team members)
- Milestones (time-boxed goals)
- Tags (categories for tasks)

## Current Project State

### People (${snapshot.people.length})
${JSON.stringify(snapshot.people, null, 2)}

### Milestones (${snapshot.milestones.length})
${JSON.stringify(snapshot.milestones, null, 2)}

### Tags (${snapshot.tags.length})
${JSON.stringify(snapshot.tags, null, 2)}

### Tasks (${snapshot.tasks.length})
${JSON.stringify(snapshot.tasks, null, 2)}

## Task Statuses
Tasks flow through these statuses: backlog → todo → in_progress → in_review → done

## Guidelines
1. When creating tasks, always set appropriate status, assigneeIds (can be empty array), tagIds (can be empty array), and dependencyIds (can be empty array).
2. When updating a task, you must provide ALL fields including id, createdAt, and updatedAt from the original task.
3. Use existing person IDs, tag IDs, and milestone IDs when referencing them.
4. Story points typically use Fibonacci: 1, 2, 3, 5, 8, 13.
5. Dates should be ISO 8601 format.

Analyze the user's request and use the appropriate tools to accomplish their goal. You may need to use multiple tools in sequence.`;
}

// ============================================================================
// Agent Class
// ============================================================================

export class ProjectAgent {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.model = model;
  }

  /**
   * Execute a goal and return the planned actions.
   * Does NOT apply the actions - call executeActions() to apply them.
   */
  async planActions(
    goal: string,
    snapshot: ProjectSnapshot
  ): Promise<AgentResult> {
    const actions: AgentAction[] = [];
    let reasoning = "";

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: goal },
    ];

    // Loop to handle multi-turn tool use
    let continueLoop = true;
    while (continueLoop) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: buildSystemPrompt(snapshot),
        tools,
        messages,
      });

      // Collect text blocks for reasoning
      for (const block of response.content) {
        if (block.type === "text") {
          reasoning += block.text + "\n";
        }
      }

      // Check if we need to process tool calls
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        // Add assistant message with tool use
        messages.push({ role: "assistant", content: response.content });

        // Process each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          const action = this.toolCallToAction(
            toolUse.name as AgentActionType,
            toolUse.input as Record<string, unknown>
          );
          if (action) {
            actions.push(action);
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: true,
              message: `Action ${toolUse.name} queued for execution`,
            }),
          });
        }

        // Add tool results
        messages.push({ role: "user", content: toolResults });
      } else {
        // No more tool calls, we're done
        continueLoop = false;
      }
    }

    return { reasoning: reasoning.trim(), actions };
  }

  /**
   * Convert a tool call to an AgentAction
   */
  private toolCallToAction(
    name: AgentActionType,
    input: Record<string, unknown>
  ): AgentAction | null {
    switch (name) {
      case "addTask":
        return {
          type: "addTask",
          payload: {
            title: input.title as string,
            description: input.description as string | undefined,
            status: (input.status as TaskStatus) || "todo",
            storyPoints: input.storyPoints as number | undefined,
            assigneeIds: (input.assigneeIds as string[]) || [],
            tagIds: (input.tagIds as string[]) || [],
            dependencyIds: (input.dependencyIds as number[]) || [],
            milestoneId: input.milestoneId as string | undefined,
            startDate: input.startDate as string | undefined,
            endDate: input.endDate as string | undefined,
          },
        };

      case "updateTask":
        return {
          type: "updateTask",
          payload: input as unknown as Task,
        };

      case "deleteTask":
        return {
          type: "deleteTask",
          payload: { id: input.id as number },
        };

      case "moveTask":
        return {
          type: "moveTask",
          payload: {
            taskId: input.taskId as number,
            newStatus: input.newStatus as TaskStatus,
          },
        };

      case "addPerson":
        return {
          type: "addPerson",
          payload: {
            name: input.name as string,
            avatarUrl: input.avatarUrl as string | undefined,
          },
        };

      case "updatePerson":
        return {
          type: "updatePerson",
          payload: input as unknown as Person,
        };

      case "deletePerson":
        return {
          type: "deletePerson",
          payload: { id: input.id as string },
        };

      case "addMilestone":
        return {
          type: "addMilestone",
          payload: {
            name: input.name as string,
            description: input.description as string | undefined,
            startDate: input.startDate as string | undefined,
            endDate: input.endDate as string | undefined,
          },
        };

      case "updateMilestone":
        return {
          type: "updateMilestone",
          payload: input as unknown as Milestone,
        };

      case "deleteMilestone":
        return {
          type: "deleteMilestone",
          payload: { id: input.id as string },
        };

      case "addTag":
        return {
          type: "addTag",
          payload: {
            name: input.name as string,
            color: input.color as string,
          },
        };

      case "updateTag":
        return {
          type: "updateTag",
          payload: input as unknown as Tag,
        };

      case "deleteTag":
        return {
          type: "deleteTag",
          payload: { id: input.id as string },
        };

      default:
        return null;
    }
  }
}

// ============================================================================
// Action Executor
// ============================================================================

/**
 * Execute a list of agent actions against the project store
 */
export function executeActions(actions: AgentAction[]): void {
  const store = useProjectStore.getState();

  for (const action of actions) {
    switch (action.type) {
      case "addTask":
        store.addTask(action.payload);
        break;
      case "updateTask":
        store.updateTask(action.payload);
        break;
      case "deleteTask":
        store.deleteTask(action.payload.id);
        break;
      case "moveTask":
        store.moveTask(action.payload.taskId, action.payload.newStatus);
        break;
      case "addPerson":
        store.addPerson(action.payload);
        break;
      case "updatePerson":
        store.updatePerson(action.payload);
        break;
      case "deletePerson":
        store.deletePerson(action.payload.id);
        break;
      case "addMilestone":
        store.addMilestone(action.payload);
        break;
      case "updateMilestone":
        store.updateMilestone(action.payload);
        break;
      case "deleteMilestone":
        store.deleteMilestone(action.payload.id);
        break;
      case "addTag":
        store.addTag(action.payload);
        break;
      case "updateTag":
        store.updateTag(action.payload);
        break;
      case "deleteTag":
        store.deleteTag(action.payload.id);
        break;
    }
  }
}

/**
 * Get current project state as a snapshot
 */
export function getProjectSnapshot(): ProjectSnapshot {
  const store = useProjectStore.getState();
  return {
    tasks: store.tasks,
    people: store.people,
    milestones: store.milestones,
    tags: store.tags,
  };
}

// ============================================================================
// React Hook for using the agent
// ============================================================================

type AgentState = {
  isLoading: boolean;
  error: string | null;
  lastResult: AgentResult | null;
};

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY as string;

const agent = new ProjectAgent(CLAUDE_API_KEY);

export function useProjectAgent() {
  const [state, setState] = useState<AgentState>({
    isLoading: false,
    error: null,
    lastResult: null,
  });

  const runGoal = useCallback(
    async (goal: string, autoExecute: boolean = false) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const snapshot = getProjectSnapshot();
        const result = await agent.planActions(goal, snapshot);

        if (autoExecute && result.actions.length > 0) {
          executeActions(result.actions);
        }

        setState({ isLoading: false, error: null, lastResult: result });
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setState((s) => ({ ...s, isLoading: false, error: message }));
        return null;
      }
    },
    []
  );

  const executeLastResult = useCallback(() => {
    if (state.lastResult) {
      executeActions(state.lastResult.actions);
    }
  }, [state.lastResult]);

  return {
    ...state,
    runGoal,
    executeLastResult,
    executeActions,
  };
}
