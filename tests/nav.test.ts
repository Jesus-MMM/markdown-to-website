import { describe, expect, it } from "vitest";
import { buildNav, renderNavHtml } from "../src/nav.js";
import type { Page } from "../src/types.js";

function page(route: string, title: string, source: string, meta: Record<string, unknown> = {}): Page {
	return { route, source, title, meta, html: "", slug: route ? route.split("/") : [] };
}

describe("buildNav", () => {
	it("genera jerarquía de secciones e hijos, con el home primero", () => {
		const nav = buildNav([
			page("", "Home", "index.md"),
			page("guia", "Guía", "guia/index.md"),
			page("guia/instalacion", "Instalación", "guia/instalacion.md", { order: 1 }),
			page("guia/usage", "Uso", "guia/usage.md"),
			page("acerca", "Acerca", "acerca.md"),
		]);

		expect(nav[0].title).toBe("Home");
		expect(nav[0].url).toBe("/");

		const guia = nav.find((n) => n.title === "Guía");
		expect(guia).toBeDefined();
		expect(guia!.url).toBe("/guia/");
		expect(guia!.children.map((c) => c.title)).toEqual(["Instalación", "Uso"]);
	});

	it("respeta el orden del frontmatter", () => {
		const nav = buildNav([
			page("a", "B", "a.md", { order: 3 }),
			page("b", "A", "b.md", { order: 1 }),
		]);
		expect(nav.map((n) => n.title)).toEqual(["A", "B"]);
	});

	it("conserva los hijos de una sección aunque su index.md llegue después", () => {
		// Simula el orden real de walk: los hijos se procesan antes que index.md
		const nav = buildNav([
			page("ref/cli", "CLI", "ref/cli.md", { order: 1 }),
			page("ref/config", "Config", "ref/config.md", { order: 2 }),
			page("ref", "Referencia", "ref/index.md", { order: 4 }),
			page("ref/plantillas", "Plantillas", "ref/plantillas.md", { order: 3 }),
		]);

		const ref = nav.find((n) => n.title === "Referencia");
		expect(ref).toBeDefined();
		expect(ref!.url).toBe("/ref/");
		expect(ref!.children.map((c) => c.title).sort()).toEqual(["CLI", "Config", "Plantillas"]);
	});
});

describe("renderNavHtml", () => {
	it("resalta la página activa", () => {
		const nav = buildNav([
			page("", "Home", "index.md"),
			page("guia", "Guía", "guia/index.md"),
			page("guia/instalacion", "Instalación", "guia/instalacion.md"),
			page("acerca", "Acerca", "acerca.md"),
		]);
		const html = renderNavHtml(nav, "guia/instalacion");
		expect(html).toContain('class="active');
		expect(html).toContain("/guia/instalacion/");
		expect(html).toContain("acerca");
	});
});