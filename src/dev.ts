import path from "node:path";
import http from "node:http";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { SiteConfig } from "./types.js";
import { loadPages } from "./loader.js";
import { buildNav } from "./nav.js";
import { discoverAssets } from "./assets.js";
import { registerPartials } from "./template.js";
import { renderOne, defaultTemplatesDirHint } from "./build.js";

const RELOAD_SCRIPT = `<script>
(function () {
  var es = new EventSource('/__md2site/reload');
  es.onmessage = function (e) {
    if (e.data === 'reload') { location.reload(); }
  };
  es.onopen = function () {
    // reconexión automática del navegador tras error
  };
})();
</script>`;

function buildLiveReloadHtml(html: string): string {
	if (html.includes(RELOAD_SCRIPT)) return html;
	return html.replace("</body>", `${RELOAD_SCRIPT}</body>`);
}

/**
 * Inicia un servidor de desarrollo con live-reload.
 * Renderiza cada página bajo demanda (viendo siempre los cambios de
 * docs/ y templates/) y notifica a los clientes vía Server-Sent Events
 * cuando cambian los archivos fuente, provocando una recarga del navegador.
 */
export async function startDev(config: SiteConfig): Promise<http.Server> {
	const defaultTemplatesDir = await defaultTemplatesDirHint();
	const clients = new Set<http.ServerResponse>();

	async function renderTree() {
		const pages = await loadPages(config.docsDir, config.base);
		const nav = buildNav(pages, config.base);
		const assets = await discoverAssets(config.templatesDir);
		await registerPartials(config.templatesDir, defaultTemplatesDir, true);
		return { pages, nav, assets };
	}

	function broadcast() {
		for (const res of clients) {
			res.write("data: reload\n\n");
		}
	}

	async function handleSse(res: http.ServerResponse): Promise<void> {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});
		res.write("retry: 1000\n\n");
		clients.add(res);
		res.on("close", () => clients.delete(res));
	}

	const server = http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
			const pathname = decodeURIComponent(url.pathname);

			if (pathname === "/__md2site/reload") {
				handleSse(res);
				return;
			}

			// Ruta normalizada de la página (sin barras laterales).
			const clean = pathname.replace(/^\/+|\/+$/g, "");
			const isPageRequest = pathname.endsWith("/") || pathname === "" || pathname.endsWith(".html");

			if (isPageRequest) {
				// Obtener el route objetivo.
				let route = clean.replace(/\.html$/i, "");
				if (route.endsWith("index")) route = route.slice(0, -"index".length).replace(/\/+$/, "");

				const tree = await renderTree();
				let page = tree.pages.find((p) => p.route === route);
				// Si no es una ruta de página, intentar servir un asset de docs/.
				if (!page) {
					return serveAsset(req, res, config, pathname);
				}

				let html = await renderOne(config, defaultTemplatesDir, page, tree.nav, tree.assets);
				html = buildLiveReloadHtml(html);
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				return res.end(html);
			}

			// Asset o archivo estático.
			return serveAsset(req, res, config, pathname);
		} catch (err) {
			res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
			res.end(`Error del servidor de desarrollo:\n${(err as Error).message}`);
		}
	});

	// Vigilar cambios en docs/ y templates/ (recursivo) para recargar.
	for (const dir of [config.docsDir, config.templatesDir]) {
		watchSafe(dir, broadcast);
	}
	// Vigilar la config para recargar cambios de configuración.
	const configFile = path.join(path.dirname(config.docsDir), "md2site.config.ts");
	watchSafe(configFile, broadcast);

	return server;
}

async function serveAsset(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	config: SiteConfig,
	pathname: string,
): Promise<void> {
	const candidates = [
		// Si es una ruta de tipo /algo/foo, buscar dentro de docs/
		path.join(config.docsDir, pathname.replace(/^\/+/, "")),
		path.join(config.templatesDir, pathname.replace(/^\/+/, "")),
	];
	for (const candidate of candidates) {
		try {
			const info = await stat(candidate);
			if (info.isFile()) {
				const ext = path.extname(candidate).toLowerCase();
				const types: Record<string, string> = {
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
				const body = await readFile(candidate);
				res.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
				res.end(body);
				return;
			}
		} catch {
			/* continuar */
		}
	}
	res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
	res.end("404 Not Found");
}

function watchSafe(target: string, onChange: () => void): void {
	try {
		const watcher = watch(target, { recursive: true });
		watcher.on("change", () => setTimeout(onChange, 50));
		watcher.on("error", () => {
			/* ignorar errores del watcher */
		});
	} catch {
		/* el destino puede no existir o no soportar watch recursivo */
	}
}
