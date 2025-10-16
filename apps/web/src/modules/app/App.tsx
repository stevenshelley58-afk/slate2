import { useMemo } from "react";

export function App() {
  const greeting = useMemo(
    () =>
      "Slate creative control center placeholder. Wire up Express and Pro flows here.",
    [],
  );

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>{greeting}</h1>
      <p>
        Implement Express and Owner workflows by consuming orchestrator APIs,
        state machine feeds, and artifact previews. This placeholder keeps the
        UI build passing while backend services come online.
      </p>
    </main>
  );
}
