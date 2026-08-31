import path from "node:path";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".json": "application/json; charset=utf-8",
};

/**
 * Inicia un servidor HTTP estático sobre un directorio de salida.
 * Soporta rutas por carpetas: "/guia/instalacion/" sirve index.html.
 */
export async function startStaticServer(outDir: string, port: number): Promise<http.Server> {
	const root = path.resolve(outDir);

	const server = http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
			let pathname = decodeURIComponent(url.pathname);

			// Resolver índice para rutas que terminan en "/".
			if (pathname.endsWith("/")) pathname += "index.html";
			if (pathname === "") pathname = "/index.html";

			let file = path.join(root, pathname);
			// Evitar path traversal.
			if (!file.startsWith(root)) {
				res.writeHead(403);
				return res.end("403 Forbidden");
			}

			try {
				const info = await stat(file);
				if (info.isDirectory()) {
					file = path.join(file, "index.html");
				}
			} catch {
				/* no existe */
			}

			const body = await readFile(file);
			const ext = path.extname(file).toLowerCase();
			res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
			res.end(body);
		} catch {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("404 Not Found");
		}
	});

	return server;
}
