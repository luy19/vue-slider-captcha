import { fileURLToPath, URL } from "node:url";
import { defineConfig, splitVendorChunkPlugin } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import { getBabelOutputPlugin } from "@rollup/plugin-babel";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/main.ts", import.meta.url)),
      name: "VueSliderCaptcha",
      fileName: "vue-slider-captcha",
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
    cssTarget: ["chrome61"],
  },
  plugins: [
    splitVendorChunkPlugin(),
    vue(),
    vueJsx(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver(), IconsResolver()],
    }),
    Icons(),
    getBabelOutputPlugin({
      allowAllFormats: true,
      presets: [
        [
          "@babel/preset-env",
          {
            useBuiltIns: false,
            exclude: ["transform-typeof-symbol"],
            modules: false,
          },
        ],
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
