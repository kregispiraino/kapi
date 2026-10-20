import { spawn } from "node:child_process";
import { watch } from "node:fs";
const root = new URL("../", import.meta.url);
let building = false;
let queued = false;
let timer;
function build() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  const child = spawn(process.execPath, ["tools/build.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  child.on("exit", () => {
    building = false;
    if (queued) {
      queued = false;
      build();
    }
  });
}
for (const directory of ["assets/css", "assets/js"]) {
  watch(new URL(directory, root), () => {
    clearTimeout(timer);
    timer = setTimeout(build, 80);
  });
}
build();
const server = spawn(process.execPath, ["tools/server.mjs"], {
  cwd: root,
  stdio: "inherit",
});
function close() {
  server.kill();
  process.exit();
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
server.on("exit", (code) => process.exit(code || 0));
