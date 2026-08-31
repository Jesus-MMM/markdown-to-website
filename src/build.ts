import path from "node:path";
import { promises as fs } from "node:fs";
import type { SiteConfig } from "./types.js";
import { loadPages } from "./loader.js";
import { buildNav } from "./nav.js";
import { discoverAssets } from "./assets.js";
import { registerPartials, buildContext, renderPage } from "./template.js";

const DEFAULT_TEMPLATES_DIR = path.resolve(import.meta.dirname, "../templates/default");

export interface BuildResult {
	pages: number;
	outDir: string;
}

export function defaultTemplatesDirHint(): string {
	return DEFAULT_TEMPLATES_DIR;
}

/**
 * Copia los assets del usuario (css/js) a la salida, preservando su
 * estructura relativa dentro del directorio de plantillas.
 */
async function copyAssets(templatesDir: string, outDir: string): Promise<void> {
	const bundle = await discoverAssets(templatesDir);
	const files = [...bundle.css, ...bundle.js];
	for (const abs of files) {
		const rel = path.relative(templatesDir, abs);
		const target = path.join(outDir, rel);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.copyFile(abs, target);
	}
}

/**
 * Ejecuta el build completo: parsea los markdowns, genera la navegación,
 * renderiza las páginas con las plantillas y escribe la salida estática
 * en rutas por carpetas dentro de outDir.
 */
export async function build(config: SiteConfig): Promise<BuildResult> {
	const defaultTemplatesDir = defaultTemplatesDirHint();
	await fs.rm(config.outDir, { recursive: true, force: true });
	await fs.mkdir(config.outDir, { recursive: true });

	const pages = await loadPages(config.docsDir);
	const nav = buildNav(pages);
	const assets = await discoverAssets(config.templatesDir);
	await registerPartials(config.templatesDir, defaultTemplatesDir);

	await copyAssets(config.templatesDir, config.outDir);

	for (const page of pages) {
		const html = await renderOne(config, defaultTemplatesDir, page, nav, assets);

		// La ruta raíz ("") se escribe en la raíz de outDir; el resto en carpetas.
		const relDir = page.route ? page.route : ".";
		const targetDir = path.join(config.outDir, relDir);
		await fs.mkdir(targetDir, { recursive: true });
		await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
	}

	return { pages: pages.length, outDir: config.outDir };
}

export async function renderOne(
	config: SiteConfig,
	defaultTemplatesDir: string,
	page: Awaited<ReturnType<typeof loadPages>>[number],
	nav: Awaited<ReturnType<typeof buildNav>>,
	assets: Awaited<ReturnType<typeof discoverAssets>>,
): Promise<string> {
	const ctx = buildContext(page, config, nav, assets, config.templatesDir);
	return renderPage(ctx, page, config.templatesDir, defaultTemplatesDir);
}
