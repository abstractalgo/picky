import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  plugins: [tailwindcss(), react()],
});
