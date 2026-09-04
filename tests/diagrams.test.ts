import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

/**
 * @vitest-environment jsdom
 */

const repo = resolve(process.cwd());

async function loadMainJs(): Promise<string> {
	return readFile(resolve(repo, "templates", "default", "js", "main.js"), "utf8");
}

function makeSvg(label: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 120" width="220" height="120"><rect width="220" height="120" fill="#fff"/><text x="10" y="30">${label}</text></svg>`;
}

function makeMermaidFake() {
	return {
		initialize: vi.fn(),
		render: vi.fn((_id: string, _source: string) =>
			Promise.resolve({ svg: makeSvg("mermaid-ok") }),
		),
	};
}

/**
 * Ejecuta el main.js real dentro de jsdom. El «body» del IIFE usa `import()`
 * dinámico; lo sustituimos por un fake resolviendo la variable `import` como
 * parámetro de una función generada con `new Function`.
 */
async function runMainJs(mermaidFake: ReturnType<typeof makeMermaidFake>) {
	const mainJs = await loadMainJs();

	// DOM con un diagrama Mermaid (estructura que genera el pipeline).
	const dom = new JSDOM(
		`<!doctype html><html data-theme="light"><body>
      <div class="content"><article>
        <div class="diagram diagram-mermaid"><pre class="mermaid">graph TD\\n  A --> B</pre></div>
      </article></div>
    </body></html>`,
		{ url: "https://example.com/", pretendToBeVisual: true },
	);

	const win = dom.window;
	const doc = win.document;

	const fakeImport = vi.fn((spec: string) => {
		if (spec.includes("mermaid")) return Promise.resolve({ default: mermaidFake });
		return Promise.reject(new Error("Unexpected import: " + spec));
	});

	// Los globals de jsdom quedan en globalThis durante la prueba.
	Object.assign(globalThis, {
		window: win,
		document: doc,
		navigator: win.navigator,
		localStorage: win.localStorage,
		matchMedia: win.matchMedia,
		location: win.location,
		Blob: win.Blob,
		URL: win.URL,
		DOMParser: win.DOMParser,
		Element: win.Element,
		HTMLElement: win.HTMLElement,
	});

	try {
		// Sustituimos el `import()` dinámico por un identificador que podemos
		// inyectar como parámetro (import no puede ser nombre de parámetro).
		const instrumented = mainJs.replaceAll("import(", "__mdImport(");
		const runner = new Function("__mdImport", instrumented);
		runner(fakeImport);
	} finally {
	}

	return { dom, doc, win, fakeImport, mermaidFake };
}

async function waitFor(fn: () => boolean, timeout = 2000): Promise<void> {
	const start = Date.now();
	while (!fn()) {
		if (Date.now() - start > timeout) throw new Error("timeout esperando condición");
		await new Promise((r) => setTimeout(r, 10));
	}
}

describe("controles de diagrama (main.js)", () => {
	let mermaidFake: ReturnType<typeof makeMermaidFake>;
	let toolbar: Element | null;
	let viewport: Element | null;
	let canvas: Element | null;

	beforeEach(async () => {
		mermaidFake = makeMermaidFake();
		const res = await runMainJs(mermaidFake);
		await waitFor(() => !!res.doc.querySelector(".diagram-viewport"));
		toolbar = res.doc.querySelector(".diagram-toolbar");
		viewport = res.doc.querySelector(".diagram-viewport");
		canvas = res.doc.querySelector(".diagram-canvas");
	});

	afterEach(() => {
		// Limpia los globals inyectados.
		Object.assign(globalThis, {
			window: undefined as unknown,
			document: undefined as unknown,
			navigator: undefined as unknown,
			localStorage: undefined as unknown,
			location: undefined as unknown,
		});
	});

	it("monta toolbar con botones de zoom, reset y descarga", () => {
		expect(toolbar).not.toBeNull();
		const actions = Array.from(toolbar!.querySelectorAll(".diagram-btn")).map((b) =>
			(b as HTMLElement).dataset.action,
		);
		expect(actions).toEqual(["zoom-in", "zoom-out", "reset", "download"]);
	});

	it("muestra el SVG dentro de viewport/canvas", () => {
		expect(viewport).not.toBeNull();
		expect(canvas).not.toBeNull();
		expect(canvas!.querySelector("svg")).not.toBeNull();
	});

	it("zoom-in aumenta la escala del canvas", () => {
		const btn = toolbar!.querySelector('[data-action="zoom-in"]') as HTMLButtonElement;
		btn.click();
		expect(canvas!.getAttribute("style")).toContain("scale(1.25)");
	});

	it("dar dos veces zoom-in y reset restablece la vista", () => {
		(toolbar!.querySelector('[data-action="zoom-in"]') as HTMLButtonElement).click();
		(toolbar!.querySelector('[data-action="zoom-in"]') as HTMLButtonElement).click();
		(toolbar!.querySelector('[data-action="reset"]') as HTMLButtonElement).click();
		expect(canvas!.getAttribute("style")).toBe("transform: translate(0px,0px) scale(1);");
	});

	it("inicializa y renderiza el diagrama Mermaid", async () => {
		await waitFor(() => mermaidFake.render.mock.calls.length > 0);
		expect(mermaidFake.initialize).toHaveBeenCalled();
		expect(mermaidFake.render).toHaveBeenCalled();
	});
});
