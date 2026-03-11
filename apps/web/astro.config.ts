import { defineConfig } from "astro/config";
import { buildMetadataIntegration } from "./src/integrations/build-metadata";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
import svelte from "@astrojs/svelte";

const site = process.env.WEB_SITE_URL;

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  site,
  server: {
    port: 9902,
  },
  build: {
    serverEntry: "index.mjs",
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:9901",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  },
  redirects: {
    "/list": {
      status: 301,
      destination: "/site",
    },
    "/new": {
      status: 301,
      destination: "/site/submit",
    },
    "/random": {
      status: 301,
      destination: "/site/go-site",
    },
    "/charts": {
      status: 301,
      destination: "/site/stats",
    },
  },
  integrations: [
    buildMetadataIntegration(),
    svelte(),
    mdx(),
    ...(site ? [sitemap()] : []),
    partytown(),
  ],
});
