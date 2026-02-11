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
        const src = `.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 20;
  overflow-y: auto;
}

.modal-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
}

.modal-header h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  line-height: 1.25rem;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.loader-container {
  height: 100%;
  width: 100%;
  min-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #FFF;
  border-bottom-color: #FF3D00;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

${file.source}`;

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
