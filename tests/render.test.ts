import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverAssets } from "../src/assets.js";
import { registerPartials, buildContext, renderPage } from "../src/template.js";
import { defaultTemplatesDirHint, renderOne } from "../src/build.js";
import { buildNav } from "../src/nav.js";
import { loadPages } from "../src/loader.js";
import type { Page, SiteConfig } from "../src/types.js";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const defaultTpl = path.join(repo, "templates", "default");

function makeConfig(tempDocs: string): SiteConfig {
	return {
		title: "Mi Doc",
		lang: "es",
		outDir: path.join(repo, "dist"),
		docsDir: tempDocs,
		templatesDir: path.join(repo, "templates"),
		dev: { port: 5173, open: false },
	};
}

describe("template engine", () => {
	it("compila un layout simple con partials y contexto", async () => {
		await registerPartials(path.join(repo, "templates"), defaultTpl, true);

		const page: Page = {
			route: "guia/instalacion",
			source: "guia/instalacion.md",
			title: "Instalación",
			meta: { title: "Instalación" },
			html: "<p>Paso 1</p>",
			slug: ["guia", "instalacion"],
		};
		const config = makeConfig("/noexiste/docs");
		const assets = { css: [], js: [] };
		const ctx = buildContext(page, config, [], assets, config.templatesDir);
		const html = await renderPage(ctx, page, config.templatesDir, defaultTpl);

		expect(html).toContain("<title>Instalación · Mi Doc</title>");
		expect(html).toContain('class="site-header"');
	});

	it("renderiza el árbol completo con payload de ejemplo", async () => {
		await registerPartials(path.join(repo, "templates"), defaultTpl, true);
		const config = makeConfig(path.join(repo, "tests", "fixtures", "docs"));
		const pages = await loadPages(config.docsDir);
		const nav = buildNav(pages);
		const assets = await discoverAssets(config.templatesDir);
		const page = pages[0];
		const html = await renderOne(config, defaultTpl, page, nav, assets);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain(page.title);
	});
});
