import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* <RecordAndTranscribe
      onTranscript={(segm) => console.log(segm)}
      onComplete={(words) => {
        console.log(words);
      }}
    /> */}
  </StrictMode>
);
