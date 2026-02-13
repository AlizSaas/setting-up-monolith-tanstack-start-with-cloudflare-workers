import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { sentryVitePlugin } from "@sentry/vite-plugin";

const config = defineConfig({
  build:{
    sourcemap: import.meta.env.PROD ? 'hidden' : true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
  
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      start: { entry: "./start.tsx" },
      server: { entry: "./server.ts" },
    }),
    viteReact(),
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      sentryVitePlugin({
  org: "alizorganization",  // ← from your Organization Slug
  project: "node-cloudflare-workers", // ← find this in Settings → Projects
  authToken: process.env.SENTRY_AUTH_TOKEN,
}),
  ],
})

export default config
