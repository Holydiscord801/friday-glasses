import { useEffect, useState } from "react";
import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  TextContainerProperty,
} from "@evenrealities/even_hub_sdk";

type Status = "connecting" | "connected" | "unavailable" | "error";

function App() {
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const bridge = await Promise.race([
          waitForEvenAppBridge(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10_000)
          ),
        ]);

        if (cancelled) return;

        const text = new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          containerID: 1,
          containerName: "main",
          isEventCapture: 1,
          content: "FRIDAY ONLINE\n\nConnected and ready.",
          borderWidth: 0,
          paddingLength: 8,
        });

        const page = new CreateStartUpPageContainer();
        page.containerTotalNum = 1;
        page.textObject = [text];

        const result = await bridge.createStartUpPageContainer(page);
        if (cancelled) return;

        if (result === 0) {
          setStatus("connected");
        } else {
          setStatus("error");
          setError(`createStartUpPageContainer returned ${result}`);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.message === "timeout") {
          setStatus("unavailable");
        } else {
          setStatus("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", color: "#e0e0e0", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ color: "#00ff88", fontSize: "1.5rem" }}>FRIDAY</h1>
      <p style={{ marginTop: "1rem" }}>
        {status === "connecting" && "Connecting..."}
        {status === "connected" && "Connected"}
        {status === "unavailable" && "Bridge not available - open in Even App"}
        {status === "error" && `Error: ${error}`}
      </p>
    </div>
  );
}

export default App;
