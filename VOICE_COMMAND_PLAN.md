# Voice Command Resolution Pipeline

## Context

The user wants to control the project management app via voice while hovering over UI elements. When they say things like "move this to done" while hovering over a task, the system should resolve "this" to the hovered task and execute the command. This requires correlating Deepgram STT word timestamps with hover event timestamps, then using the AI agent to interpret and execute each command.

## Pipeline Overview

```
Record speech + track hovers -> STT words with timestamps
  -> AI tags demonstrative phrases -> Match phrases to hover events
    -> AI resolves each phrase into actions -> Execute via confirmation UI
```

---

## New Files

All in `src/components/voice-command/`:

| File                          | Responsibility                                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| `types.ts`                    | Pipeline types                                                     |
| `useDeepgramRecorder.ts`      | Headless recording hook (extracted from RecordAndTranscribe)       |
| `reference-tagger.ts`         | AI Call 1: identify demonstrative phrases in transcript            |
| `hover-matcher.ts`            | Pure function: match phrase time ranges to hover events            |
| `entity-resolver.ts`          | Look up entity data from TargetKey via project store               |
| `action-resolver.ts`          | AI Call 2: resolve each matched phrase into agent actions           |
| `run-pipeline.ts`             | Orchestrator chaining all steps                                    |
| `useVoiceCommandPipeline.ts`  | React hook managing recording state + pipeline                     |
| `VoiceCommandButton.tsx`      | Mic button UI in the header                                       |

## Modified Files

| File                                    | Change                                             |
| --------------------------------------- | -------------------------------------------------- |
| `src/components/RecordAndTranscribe.tsx` | Refactor to consume `useDeepgramRecorder` hook     |
| `src/App.tsx`                           | Add `<VoiceCommandButton />` to header             |

---

## Implementation Steps

### Step 1: Define Types (`types.ts`)

Key types:

- **`RecordingSession`** — `{ recordingStartTime: number, words: TranscribedWord[], fullTranscript: string }`
- **`TaggedReference`** — AI output identifying a demonstrative phrase:
  ```ts
  {
    demonstrativeWords: string;    // e.g. "this", "those"
    commandPhrase: string;         // e.g. "move this to done"
    wordIndexStart: number;        // inclusive start index into words array
    wordIndexEnd: number;          // inclusive end index into words array
    plurality: "singular" | "plural";
  }
  ```
- **`AbsoluteTimeRange`** — `{ startMs: number, endMs: number }` converted from STT relative seconds
- **`ResolvedHoverEntity`** — discriminated union mirroring `HoverPayload`:
  ```ts
  | { type: "task"; data: Task }
  | { type: "person"; data: Person }
  | { type: "milestone"; data: Milestone }
  | { type: "tag"; data: Tag }
  | { type: "status"; data: TaskStatus }
  ```
- **`MatchedReference`** — discriminated union:
  ```ts
  | { status: "matched"; reference: TaggedReference; timeRange: AbsoluteTimeRange; hoverEvent: CompletedHoverEvent; entity: ResolvedHoverEntity }
  | { status: "unresolved"; reference: TaggedReference; timeRange: AbsoluteTimeRange; reason: "no_hover_overlap" | "entity_not_found" }
  ```
- **`ResolvedCommand`** — `{ reference: MatchedReference & { status: "matched" }; result: AgentResult }`
- **`VoiceCommandPipelineResult`** — full pipeline output with all intermediate results
- **`VoiceCommandPipelineStatus`** — discriminated union on `phase` for UI state:
  `idle | recording | tagging_references | matching_hovers | resolving_actions | complete | error`

---

### Step 2: Extract `useDeepgramRecorder` Hook

Extract the recording logic from `RecordAndTranscribe.tsx` (lines 85-214) into a headless hook in `useDeepgramRecorder.ts`.

**Returns:**
```ts
{
  recordingState: RecordingState;
  finalizedWords: TranscribedWord[];
  interimWords: TranscribedWord[];
  currentTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => void;
}
```

**Bug fix during extraction:** The current `stopRecording` reads `finalizedWords` from React state closure, which can be stale. The hook should use a ref (`finalizedWordsRef`) to ensure `onComplete` always receives the latest words.

Refactor `RecordAndTranscribe.tsx` to consume this hook — pure UI shell, no behavior change.

---

### Step 3: Implement `entity-resolver.ts`

Two functions:

- **`resolveEntity(targetKey: TargetKey): ResolvedHoverEntity | null`** — reads from `useProjectStore.getState()` to look up the actual entity by type and ID
- **`describeEntity(entity: ResolvedHoverEntity): string`** — human-readable description for AI prompts, e.g.:
  ```
  Task #5: "Fix login bug" (status: todo, assignees: [person-1, person-2])
  ```

---

### Step 4: Implement `hover-matcher.ts`

Pure function `matchReferencesToHovers(session, references, hoverHistory) -> MatchedReference[]`:

1. For each `TaggedReference`, convert word indices to absolute ms:
   - `startMs = recordingStartTime + words[wordIndexStart].start * 1000`
   - `endMs = recordingStartTime + words[wordIndexEnd].end * 1000`
2. For each `CompletedHoverEvent` in history, compute overlap:
   - `overlap = max(0, min(phraseEnd, hoverEnd) - max(phraseStart, hoverStart))`
3. Pick hover with **longest overlap**
4. If no overlap > 0 -> `{ status: "unresolved", reason: "no_hover_overlap" }`
5. Call `resolveEntity()` on the best hover's targetKey. If entity was deleted -> `{ status: "unresolved", reason: "entity_not_found" }`

---

### Step 5: Implement `reference-tagger.ts`

Single function `tagReferences(client: Anthropic, session: RecordingSession): Promise<TaggedReference[]>`

- **Single-turn** Claude Haiku call (no tools, JSON output)
- System prompt identifies phrases containing demonstratives/pronouns (`this`, `that`, `these`, `those`, `it`, `them`, `here`, `there`) that refer to something being pointed at
- User message includes transcript words with 0-based indices:
  ```
  [0] "move" [1] "this" [2] "to" [3] "done"
  ```
- Response: JSON array of `TaggedReference` objects
- Validate word indices are in bounds

---

### Step 6: Implement `action-resolver.ts`

Reuses existing `aiAgent.planActions(goal)` from `ai-agent.ts`.

For each matched reference, construct a goal string:
```
The user said: "move this to done"
In this command, "this" refers to: Task #5: "Fix login bug" (status: todo, ...)
Please interpret and execute this command.
```

Process matched references **sequentially** to avoid API rate limiting and maintain ordering.

Returns `{ resolved: ResolvedCommand[], unresolved: MatchedReference[] }`.

---

### Step 7: Implement `run-pipeline.ts` Orchestrator

Function `runVoiceCommandPipeline(recordingStartTime, words, hoverHistory, client, callbacks?)`:

1. Build `RecordingSession` from inputs
2. Call `tagReferences()` -> if empty, short-circuit with empty result
3. Call `matchReferencesToHovers()`
4. Call `resolveActions()`
5. Collect all actions from resolved commands
6. Return `VoiceCommandPipelineResult`

Callbacks allow the UI hook to track phase transitions.

---

### Step 8: Implement `useVoiceCommandPipeline.ts` Hook

React hook managing the full lifecycle:

- **`onRecordingStart()`**: capture `recordingStartTime = Date.now()`, clear hover history
- **`onRecordingComplete(words)`**: force-complete any active hovers (`endHover` on each in `activeHovers`), snapshot hover history, run pipeline
- Tracks `VoiceCommandPipelineStatus` for UI feedback
- On `complete`: feed `allActions` to `executeActionsWithConfirmation()` (reusing existing confirmation UI)

---

### Step 9: Implement `VoiceCommandButton.tsx`

Renders in the App header. UI states:

| State | Visual |
|---|---|
| **Idle** | Mic icon button - click to start |
| **Recording** | Red pulsing button - click to stop |
| **Processing** | Spinner with phase label ("Analyzing speech...", "Resolving 2/3...") |
| **Complete** | Triggers action confirmation toasts, resets to idle |
| **Error** | Error toast, reset to idle |

Uses `useDeepgramRecorder` for audio capture and `useVoiceCommandPipeline` for the pipeline.

---

### Step 10: Wire into `App.tsx`

Add `<VoiceCommandButton />` in the header, before the "Add Task" button.

---

## Edge Cases

| Case | Handling |
|---|---|
| No demonstratives found | Toast: "No voice commands detected" |
| No hover overlap for a phrase | Report which phrases couldn't be matched |
| Active hovers at recording end | Force-complete them before running pipeline |
| Entity deleted between hover and resolution | Mark as `unresolved` with reason `entity_not_found` |
| Empty recording (no words) | Skip pipeline entirely |
| Long recordings (>2 min) | Auto-stop at 2 minutes |

---

## Verification

1. Run `bun dev` and open the app
2. Click the mic button, speak "move this to done" while hovering a task
3. Verify the pipeline identifies "this", matches it to the hovered task, and proposes a `moveTask` action
4. Test multiple phrases: "delete this and assign that to John" while hovering different elements
5. Test edge cases: speaking without hovering, hovering without demonstratives
6. Run `bun ts` for type checking, `bun lint` for linting
