import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Second app: the "Nocturne" revamp of the engine. It reuses the exact same
// knowledge library (../src/knowledge.js) as the original — only the surface
// is restyled — and runs on its own port so both can be served side by side.
export default defineConfig({
  root: "revamp",
  plugins: [react()],
  server: {
    port: process.env.REVAMP_PORT ? Number(process.env.REVAMP_PORT) : 5174,
    fs: {
      // Allow importing the shared knowledge library that lives outside `root`.
      allow: [".."],
    },
  },
});
