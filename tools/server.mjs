/** Servidor estático: arquivos públicos, compressão e leitura parcial de vídeos. */
import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT inválida.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  try {
    let path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) {
      res.writeHead(403);
      res.end("Acesso negado.");
      return;
    }
    const publicPath = relative(root, path).split(sep).join("/");
    const publicFile = ["", "index.html", "privacidade.html", "robots.txt", "sitemap.xml"].includes(publicPath);
    const publicDirectory = ["assets/", "projetos/"].some((prefix) => publicPath.startsWith(prefix));
    if (
      (!publicFile && !publicDirectory) ||
      publicPath.split("/").some((segment) => segment.startsWith("."))
    ) {
      res.writeHead(404);
      res.end("Arquivo não encontrado.");
      return;
    }
    let info = await stat(path);
    if (info.isDirectory()) {
      path = resolve(path, "index.html");
      info = await stat(path);
    }
    if (!info.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const type = types[extname(path)] || "application/octet-stream";
    const etag = `W/"${info.size}-${Math.trunc(info.mtimeMs)}"`;
    const headers = {
      "Content-Type": type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
      Vary: "Accept-Encoding",
    };
    // As demonstrações do portfólio não são páginas comerciais da Kapi.
    if (publicPath.startsWith("projetos/")) {
      headers["X-Robots-Tag"] = "noindex, follow";
    }
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    const isMedia = type.startsWith("video/");
    if (isMedia) headers["Accept-Ranges"] = "bytes";
    let range;
    if (isMedia && req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (match && (match[1] || match[2])) {
        const start = match[1]
          ? Number(match[1])
          : Math.max(0, info.size - Number(match[2]));
        const end =
          match[1] && match[2]
            ? Math.min(Number(match[2]), info.size - 1)
            : info.size - 1;
        if (start <= end && start < info.size) range = { start, end };
      }
      if (!range) {
        res.writeHead(416, {
          ...headers,
          "Content-Range": `bytes */${info.size}`,
        });
        res.end();
        return;
      }
      headers["Content-Range"] =
        `bytes ${range.start}-${range.end}/${info.size}`;
    }
    const compress =
      !range &&
      info.size > 1024 &&
      /^(text\/|image\/svg|application\/json)/.test(type) &&
      /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    if (compress) headers["Content-Encoding"] = "gzip";
    else
      headers["Content-Length"] = range
        ? range.end - range.start + 1
        : info.size;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(path, range);
    if (compress) await pipeline(stream, createGzip(), res);
    else await pipeline(stream, res);
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const code = ["ENOENT", "ENOTDIR"].includes(error.code) ? 404 : 400;
    res.writeHead(code);
    res.end(code === 404 ? "Arquivo não encontrado." : "Requisição inválida.");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.listen(port, "0.0.0.0", () =>
  console.log(
    `kapi.digital — servidor em 0.0.0.0:${port}\nLocal: http://localhost:${port}`,
  ),
);
