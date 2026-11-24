// Builds the static copy of the app for a clinic server into dist-node/.
// The API address is the same origin ("/api"), because the clinic backend serves both.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync("dist-node", { recursive: true, force: true });
const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_OUTPUT: "export", NEXT_PUBLIC_API_URL: "/api" },
});
process.exit(result.status ?? 1);
