import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Create process.env object for all VITE_ prefixed variables
  const processEnvDefines = Object.keys(env)
    .filter((key) => key.startsWith("VITE_"))
    .reduce((acc, key) => {
      acc[`process.env.${key}`] = JSON.stringify(env[key]);
      return acc;
    }, {} as Record<string, string>);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
    define: {
      ...processEnvDefines,
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
  };
});
