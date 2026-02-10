import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type {Plugin} from "rolldown";
import packageJson from "./package.json" with {type: "json"};

const CARTOUCHE = `/*!
 * ${packageJson.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
 * (c) 2026 ${packageJson.author.name} <${packageJson.author.email}>
 * ${packageJson.author.url}
 */`;

const keepBannerAfterMinify = (banner: string): Plugin => ({
  name: "keep-banner-after-minify",
  apply: "build",
  enforce: "post",

  generateBundle(_options, bundle) {
    const ensureBanner = (content: string) => {
      // évite doublon, tolère espaces/retours en tête
      if (/^\s*\/\*!/.test(content)) return content;
      return `${banner}\n${content}`;
    };

    for (const file of Object.values(bundle)) {
      // JS chunks
      if (file.type === "chunk") {
        file.code = ensureBanner(file.code);
        continue;
      }

      // CSS assets
      // file.type === "asset"
      if (typeof file.fileName === "string" && file.fileName.endsWith(".css")) {
        const src = file.source;

        // Vite/Rollup peuvent donner string ou Uint8Array/Buffer-like
        if (typeof src === "string") {
          file.source = ensureBanner(src);
        } else if (src && typeof (src as any).toString === "function") {
          const asString = (src as any).toString("utf8");
          file.source = ensureBanner(asString);
        }
      }
    }
  },
} as Plugin)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes('-')
        }
      },
      customElement: true
    }),
    keepBannerAfterMinify(CARTOUCHE),
  ],
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // (optionnel) certaines libs lisent aussi directement process.env
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
  },
  build: {
    lib: {
      entry: './src/main.ts',
      name: 'RoomBuilder',
      formats: ['es', 'cjs', 'umd', 'iife'],
      fileName: () => 'room-builder.webcomponent.js',
      cssFileName: 'room-builder.webcomponent'
    },
    emptyOutDir: true,
    outDir: './dist',
  }
})
