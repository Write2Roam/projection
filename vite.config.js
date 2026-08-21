import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: base must match your GitHub repo name for Project Pages,
// e.g. if your repo is github.com/yourname/tenmore-dashboard, use "/tenmore-dashboard/".
// If you're deploying to a User/Org Page (yourname.github.io repo), set base to "/".
export default defineConfig({
  plugins: [react()],
  base: "/projection/",
});
