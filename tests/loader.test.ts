import path from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { walkMarkdownFiles, loadPages } from "../src/loader.js";

let dir: string;

beforeAll(async () => {
	dir = await mkdtemp(path.join(os.tmpdir(), "md2site-loader-"));
	await writeFile(path.join(dir, "index.md"), "# Home\n");
	await createDir("guia");
	await writeFile(path.join(dir, "guia", "index.md"), "# Guía\n");
	await writeFile(
		path.join(dir, "guia", "instalacion.md"),
		"---\ntitle: Instalación\norder: 1\n---\n# Instalación\n\nPaso 1.\n",
	);
	await writeFile(path.join(dir, "guia", "usage.md"), "# Uso\n");
	await createDir("api");
	await writeFile(path.join(dir, "api", "endpoints.md"), "# Endpoints\n");
	// un archivo no-markdown que debe ignorarse
	await writeFile(path.join(dir, "readme.txt"), "ignoreme");
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

async function createDir(rel: string): Promise<void> {
	const { mkdir } = await import("node:fs/promises");
	await mkdir(path.join(dir, rel), { recursive: true });
}

describe("walkMarkdownFiles", () => {
	it("encuentra todos los markdowns, ignorando no-md", async () => {
		const files = await walkMarkdownFiles(dir);
		expect(files.sort()).toEqual(["api/endpoints.md", "guia/index.md", "guia/instalacion.md", "guia/usage.md", "index.md"]);
	});
});

describe("loadPages", () => {
	it("construye rutas por carpetas con index en la raíz como home", async () => {
		const pages = await loadPages(dir);
		const byRoute = Object.fromEntries(pages.map((p) => [p.route, p]));

		expect(byRoute[""]).toBeDefined();
		expect(byRoute[""].title).toBe("Home");
		expect(byRoute["guia/instalacion"].title).toBe("Instalación");
		expect(byRoute["guia/instalacion"].meta.order).toBe(1);
		expect(byRoute["api/endpoints"].html).toContain("<h1>Endpoints</h1>");
		expect(byRoute["guia/usage"].slug).toEqual(["guia", "usage"]);
	});
});
