import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import config from "../assets/js/config.mjs";
const root = new URL("../", import.meta.url);
// Links HTML continuam corretos sem JavaScript; a configuração é a única fonte.
for (const path of ["index.html", "privacidade.html", "projetos/aml/website/index.html", "projetos/osler/website/index.html", "projetos/gear-seo/website/index.html"]) {
  const url = new URL(path, root);
  const source = await readFile(url, "utf8");
  const updated = source.replace(
    /https:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/[^\s"'<>]*/g,
    config.whatsappUrl,
  );
  if (updated !== source) await writeFile(url, updated);
}
await mkdir(new URL("assets/build/", root), { recursive: true });
const styles = await Promise.all(
  ["tokens", "styles", "animations", "responsive", "consent"].map((name) =>
    readFile(new URL(`assets/css/${name}.css`, root), "utf8"),
  ),
);
await build({
  stdin: {
    contents: styles.join("\n"),
    loader: "css",
    resolveDir: fileURLToPath(new URL("assets/css/", root)),
  },
  outfile: fileURLToPath(new URL("assets/build/site.css", root)),
  minify: true,
  target: ["safari16.4", "chrome110", "firefox115"],
  legalComments: "none",
});
await build({
  entryPoints: [fileURLToPath(new URL("assets/css/consent.css", root))],
  outfile: fileURLToPath(new URL("assets/build/tracking.css", root)),
  minify: true,
  target: ["safari16.4", "chrome110", "firefox115"],
  legalComments: "none",
});
await build({
  entryPoints: [fileURLToPath(new URL("assets/js/tracking-entry.js", root))],
  outfile: fileURLToPath(new URL("assets/build/tracking.js", root)),
  bundle: true,
  format: "iife",
  minify: true,
  target: ["safari16.4", "chrome110", "firefox115"],
  legalComments: "none",
});
await build({
  entryPoints: [fileURLToPath(new URL("assets/js/animations.js", root))],
  outfile: fileURLToPath(new URL("assets/build/site.js", root)),
  bundle: true,
  format: "iife",
  minify: true,
  target: ["safari16.4", "chrome110", "firefox115"],
  legalComments: "none",
});
console.log("CSS e JavaScript gerados em assets/build.");
