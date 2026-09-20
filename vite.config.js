import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";

function buildCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
});
