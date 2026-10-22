import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const DEFAULT_SITE_URL = "https://dearcornerbd.vercel.app";

/**
 * Replaces __SITE_URL__ in index.html (canonical, Open Graph) with the public
 * site address, so share previews always use an absolute URL.
 */
function siteUrl(url: string): Plugin {
  return {
    name: "dear-corner:site-url",
    transformIndexHtml(html) {
      return html.replaceAll("__SITE_URL__", url.replace(/\/$/, ""));
    },
  };
}

/**
 * Writes robots.txt at build time so its Sitemap line uses the site address.
 * Private pages (account, checkout, admin) stay out of search results.
 */
function robotsTxt(url: string): Plugin {
  const site = url.replace(/\/$/, "");
  return {
    name: "dear-corner:robots",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /account",
          "Disallow: /cart",
          "Disallow: /checkout",
          "Disallow: /order-confirmed/",
          "Disallow: /styleguide",
          "",
          `Sitemap: ${site}/sitemap.xml`,
          "",
        ].join("\n"),
      });
    },
  };
}

/**
 * Preloads the DM Sans 400 (Latin) font file. Its file name is hashed at build
 * time, so the <link rel="preload"> is injected after bundling.
 */
function preloadBodyFont(): Plugin {
  return {
    name: "dear-corner:preload-body-font",
    apply: "build",
    enforce: "post",
    transformIndexHtml(_html, ctx) {
      if (!ctx.bundle) return;
      const file = Object.keys(ctx.bundle).find((name) =>
        /dm-sans-latin-400-normal[^/]*\.woff2$/.test(name),
      );
      if (!file) return;
      return [
        {
          tag: "link",
          attrs: {
            rel: "preload",
            href: `/${file}`,
            as: "font",
            type: "font/woff2",
            crossorigin: "",
          },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [
      react(),
      tailwindcss(),
      siteUrl(env.VITE_SITE_URL || DEFAULT_SITE_URL),
      robotsTxt(env.VITE_SITE_URL || DEFAULT_SITE_URL),
      preloadBodyFont(),
    ],
    define: {
      // The /styleguide page ships everywhere except Vercel production builds.
      __SHOW_STYLEGUIDE__: JSON.stringify(
        process.env.VERCEL_ENV !== "production",
      ),
    },
    build: {
      target: "es2022",
      assetsInlineLimit: 0,
    },
  };
});
