import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
await mkdir(new URL("assets/build/", root), { recursive: true });
const styles = await Promise.all(
  ["tokens", "styles", "animations", "responsive"].map((name) =>
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
  entryPoints: [fileURLToPath(new URL("assets/js/animations.js", root))],
  outfile: fileURLToPath(new URL("assets/build/site.js", root)),
  bundle: true,
  format: "iife",
  minify: true,
  target: ["safari16.4", "chrome110", "firefox115"],
  legalComments: "none",
});
console.log("CSS e JavaScript gerados em assets/build.");
