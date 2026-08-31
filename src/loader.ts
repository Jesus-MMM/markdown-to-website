import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import type { Page } from "./types.js";
import { parseMarkdown } from "./parse.js";

interface FoundFile {
	relDir: string;
	fileName: string;
}

/**
 * Recorre el directorio docs/ de forma recursiva y devuelve las rutas
 * relativas de todos los archivos .md encontrados.
 */
export async function walkMarkdownFiles(docsDir: string): Promise<string[]> {
	const out: string[] = [];
	const root = path.resolve(docsDir);

	async function walk(dir: string, rel = ""): Promise<void> {
		let entries;
		try {
			entries = await readdir(dir);
		} catch {
			return;
		}
		entries.sort((a, b) => a.localeCompare(b));
		for (const entry of entries) {
			const abs = path.join(dir, entry);
			let info;
			try {
				info = await stat(abs);
			} catch {
				continue;
			}
			const relPath = rel ? path.join(rel, entry) : entry;
			if (info.isDirectory()) {
				await walk(abs, relPath);
			} else if (info.isFile() && entry.toLowerCase().endsWith(".md")) {
				out.push(relPath);
			}
		}
	}

	await walk(root);
	out.sort((a, b) => {
		// index.md primero dentro de cada carpeta
		const depthA = a.split(/[\\/]/).length;
		const depthB = b.split(/[\\/]/).length;
		if (depthA !== depthB) return depthA - depthB;
		return a.localeCompare(b);
	});
	return out;
}

/**
 * Carga todos los markdowns y produce la lista de páginas.
 * Cada página lleva su ruta de salida (por carpetas), frontmatter
 * y contenido HTML renderizado.
 */
export async function loadPages(docsDir: string): Promise<Page[]> {
	const files: FoundFile[] = [];
	const root = path.resolve(docsDir);

	const rels = await walkMarkdownFiles(docsDir);
	for (const rel of rels) {
		const parsed = path.parse(rel);
		files.push({ relDir: parsed.dir, fileName: parsed.name });
	}

	const pages: Page[] = [];
	for (const file of files) {
		const abs = path.join(root, file.relDir, `${file.fileName}.md`);
		const source = path.join(file.relDir, `${file.fileName}.md`);
		const raw = await readFile(abs, "utf8");
		const parsed = await parseMarkdown(raw);

		const isIndex = file.fileName.toLowerCase() === "index";

		// Ruta de salida: si es index.md, la ruta es la carpeta (sin "index").
		// Si es raíz (sin carpeta) e index, es "" (home "/").
		let route: string;
		if (isIndex) {
			route = file.relDir.replaceAll("\\", "/");
		} else {
			const combined = file.relDir ? `${file.relDir}/${file.fileName}` : file.fileName;
			route = combined.replaceAll("\\", "/");
		}

		const slug = route ? route.split("/").filter(Boolean) : [];

		pages.push({
			route,
			source,
			title: parsed.title,
			meta: parsed.meta,
			html: parsed.html,
			slug,
		});
	}

	return pages;
}
