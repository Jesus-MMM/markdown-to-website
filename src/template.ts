import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import Handlebars from "handlebars";
import type { NavItem, Page, SiteConfig } from "./types.js";
import { renderNavHtml } from "./nav.js";
import type { AssetBundle } from "./assets.js";
import { bundleForPage } from "./assets.js";

export interface TemplateContext {
	title: string;
	content: string;
	lang: string;
	site: {
		title: string;
		[key: string]: unknown;
	};
	page: Record<string, unknown>;
	nav: NavItem[];
	navHtml: string;
	currentRoute: string;
	assets: { css: string[]; js: string[] };
	[key: string]: unknown;
}

const DEFAULT_LAYOUT = "layout.html";

/**
 * Prepara el contexto de renderizado para una página.
 */
export function buildContext(
	page: Page,
	site: SiteConfig,
	nav: NavItem[],
	assets: AssetBundle,
	templatesDir: string,
): TemplateContext {
	const depth = page.slug.length;
	return {
		title: page.title || site.title,
		content: page.html,
		lang: site.lang,
		site: { title: site.title },
		page: { ...page.meta },
		nav,
		navHtml: renderNavHtml(nav, page.route),
		currentRoute: page.route,
		assets: bundleForPage(assets, templatesDir, depth),
	};
}

/**
 * Carga los partials disponibles en <templatesDir>/partials/ y los
 * registra en Handlebars. Si `force` es true, sobrescribe los existentes.
 */
export async function registerPartials(
	templatesDir: string,
	defaultTemplatesDir: string,
	force = false,
): Promise<void> {
	const candidates = [path.join(templatesDir, "partials"), path.join(defaultTemplatesDir, "partials")];
	for (const dir of candidates) {
		let files: string[];
		try {
			files = await readdir(dir);
		} catch {
			continue;
		}
		for (const file of files) {
			if (!file.endsWith(".html")) continue;
			const name = path.basename(file, ".html");
			if (!force && Handlebars.partials[name]) continue;
			const abs = path.join(dir, file);
			const source = await readFile(abs, "utf8");
			Handlebars.registerPartial(name, source);
		}
	}
}

/**
 * Compila el contexto contra una plantilla de layout. Usa el layout por
 * defecto salvo que el frontmatter de la página declare `layout`, en cuyo
 * caso se busca <templatesDir>/<layout>.html.
 */
export async function renderPage(
	context: TemplateContext,
	page: Page,
	userTemplatesDir: string,
	defaultTemplatesDir: string,
): Promise<string> {
	const layoutName = page.meta.layout ?? DEFAULT_LAYOUT;
	const userLayout = path.join(userTemplatesDir, layoutName);
	const layoutPath = existsSync(userLayout)
		? userLayout
		: path.join(defaultTemplatesDir, DEFAULT_LAYOUT);

	const source = await readFile(layoutPath, "utf8");
	const template = Handlebars.compile(source);
	return template(context);
}
