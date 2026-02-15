import { useState, useRef, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string;

// const deepgramClient = createClient({ key: DEEPGRAM_API_KEY });

// const deepgramConnection = deepgramClient.listen.live({
//   model: "nova-3",
//   language: "en",
//   smart_format: true,
//   interim_results: true,
//   utterance_end_ms: 1000,
//   vad_events: true,
//   // live transcription options
// });

// deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
//   deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
//     console.log(data);
//   });

//   source.addListener("got-some-audio", async (event) => {
//     deepgramConnection.send(event.raw_audio_data);
//   });
// });

/** A single transcribed word with timing information */
export type TranscribedWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
};

/** A segment of transcription (utterance) */
export type TranscriptSegment = {
  transcript: string;
  words: TranscribedWord[];
  isFinal: boolean;
};

type RecordingState = "idle" | "recording" | "connecting";

type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
};

type DeepgramAlternative = {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
};

type DeepgramChannel = {
  alternatives: DeepgramAlternative[];
};

type DeepgramMessage = {
  type: string;
  channel?: DeepgramChannel;
  is_final?: boolean;
  speech_final?: boolean;
};

type RecordAndTranscribeProps = {
  /** Called when new transcript data is received */
  onTranscript?: (segment: TranscriptSegment) => void;
  /** Called with all finalized words when recording stops */
  onComplete?: (words: TranscribedWord[]) => void;
  /** Additional CSS classes */
  className?: string;
};

export function RecordAndTranscribe({
  onTranscript,
  onComplete,
  className,
}: RecordAndTranscribeProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalizedWords, setFinalizedWords] = useState<TranscribedWord[]>([]);
  const [interimWords, setInterimWords] = useState<TranscribedWord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setRecordingState("idle");

    // Call onComplete with all finalized words
    if (onComplete && finalizedWords.length > 0) {
      onComplete(finalizedWords);
    }
  }, [finalizedWords, onComplete]);

  const startRecording = useCallback(async () => {
    setError(null);
    setCurrentTranscript("");
    setFinalizedWords([]);
    setInterimWords([]);
    setRecordingState("connecting");

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Connect to Deepgram WebSocket (using webm/opus which MediaRecorder produces)
      const socket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?" +
          new URLSearchParams({
            model: "nova-2",
            language: "en",
            smart_format: "true",
            interim_results: "true",
            utterance_end_ms: "1000",
            vad_events: "true",
          }),
        ["token", DEEPGRAM_API_KEY],
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setRecordingState("recording");

        // Set up MediaRecorder to send audio chunks directly
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        // Start recording with 250ms chunks for low latency
        mediaRecorder.start(250);
      };

      socket.onmessage = (event) => {
        const data: DeepgramMessage = JSON.parse(event.data);

        if (data.type === "Results" && data.channel) {
          const alternative = data.channel.alternatives[0];
          if (!alternative) {
            return;
          }

          const words: TranscribedWord[] = alternative.words.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
          }));

          const segment: TranscriptSegment = {
            transcript: alternative.transcript,
            words,
            isFinal: data.is_final ?? false,
          };

          if (data.is_final) {
            setFinalizedWords((prev) => [...prev, ...words]);
            setInterimWords([]);
          } else {
            setInterimWords(words);
          }

          setCurrentTranscript(alternative.transcript);
          onTranscript?.(segment);
        }
      };

      socket.onerror = () => {
        setError("WebSocket connection error");
        stopRecording();
      };

      socket.onclose = () => {
        setRecordingState("idle");
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      setRecordingState("idle");
    }
  }, [onTranscript, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (recordingState === "idle") {
      startRecording();
    } else {
      stopRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  const allWords = [...finalizedWords, ...interimWords];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <Button
          onClick={toggleRecording}
          variant={recordingState === "recording" ? "destructive" : "default"}
          disabled={recordingState === "connecting"}
        >
          {recordingState === "recording" ? (
            <>
              <Square className="size-4" />
              Stop Recording
            </>
          ) : recordingState === "connecting" ? (
            "Connecting..."
          ) : (
            <>
              <Mic className="size-4" />
              Start Recording
            </>
          )}
        </Button>

        {recordingState === "recording" && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-red-500" />
            Recording...
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Live transcript display */}
      <div className="min-h-[100px] rounded-md border p-4">
        {allWords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {allWords.map((word, idx) => (
              <span
                key={`${word.start}-${idx}`}
                className={cn(
                  "cursor-default rounded px-1 transition-colors hover:bg-accent",
                  idx >= finalizedWords.length && "text-muted-foreground",
                )}
                title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (${(word.confidence * 100).toFixed(0)}%)`}
              >
                {word.word}
              </span>
            ))}
          </div>
        ) : currentTranscript ? (
          <p className="text-muted-foreground">{currentTranscript}</p>
        ) : (
          <p className="text-muted-foreground">
            {recordingState === "recording"
              ? "Listening..."
              : "Click 'Start Recording' to begin transcription"}
          </p>
        )}
      </div>

      {/* Word-level timestamps table */}
      {finalizedWords.length > 0 && (
        <details className="rounded-md border">
          <summary className="cursor-pointer p-3 text-sm font-medium">
            Word Timestamps ({finalizedWords.length} words)
          </summary>
          <div className="max-h-[300px] overflow-auto p-3 pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4">Word</th>
                  <th className="pb-2 pr-4">Start (s)</th>
                  <th className="pb-2 pr-4">End (s)</th>
                  <th className="pb-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {finalizedWords.map((word, idx) => (
                  <tr key={`${word.start}-${idx}`} className="border-b">
                    <td className="py-1 pr-4 font-mono">{word.word}</td>
                    <td className="py-1 pr-4 font-mono">
                      {word.start.toFixed(3)}
                    </td>
                    <td className="py-1 pr-4 font-mono">
                      {word.end.toFixed(3)}
                    </td>
                    <td className="py-1 font-mono">
                      {(word.confidence * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
