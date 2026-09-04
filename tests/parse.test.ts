import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/parse.js";

describe("parseMarkdown", () => {
	it("extrae frontmatter y convierte el contenido a HTML", async () => {
		const doc = await parseMarkdown(
			"---\ntitle: Mi Título\norder: 3\n---\n# Encabezado\n\nUn **texto**.",
		);
		expect(doc.meta.title).toBe("Mi Título");
		expect(doc.meta.order).toBe(3);
		expect(doc.html).toContain("<h1>Encabezado</h1>");
		expect(doc.html).toContain("<strong>texto</strong>");
	});

	it("deduce el título desde el primer H1 si no hay frontmatter", async () => {
		const doc = await parseMarkdown("# Único título\n\nContenido.");
		expect(doc.meta).toEqual({});
		expect(doc.title).toBe("Único título");
	});

	it("prioriza el título del frontmatter sobre el H1", async () => {
		const doc = await parseMarkdown("---\ntitle: Del Frontmatter\n---\n# Del H1\n");
		expect(doc.title).toBe("Del Frontmatter");
	});

	it("devuelve título vacío si no hay título ni H1", async () => {
		const doc = await parseMarkdown("Solo texto sin encabezados.");
		expect(doc.title).toBe("");
	});

	it("renderiza tablas GFM a <table> con cabecera y celdas", async () => {
		const doc = await parseMarkdown(
			"| Col A | Col B |\n|-------|-------|\n| 1 | 2 |\n| 3 | 4 |\n",
		);
		expect(doc.html).toContain("<table>");
		expect(doc.html).toContain("<th>Col A</th>");
		expect(doc.html).toContain("<td>1</td>");
		expect(doc.html).toContain("<td>4</td>");
	});

	it("convierte ``​`mermaid`` a <div class=\"diagram diagram-mermaid\"><pre class=\"mermaid\">", async () => {
		const doc = await parseMarkdown("```mermaid\ngraph TD\n  A --> B\n```");
		expect(doc.html).toContain(
			'<div class="diagram diagram-mermaid"><pre class="mermaid">graph TD\n  A --> B</pre></div>',
		);
	});

	it("convierte ``​`dot`` a <div class=\"diagram diagram-dot\" data-diagram-type=\"dot\"> conservando la fuente", async () => {
		const doc = await parseMarkdown("```dot\ndigraph G {\n  A -> B;\n}\n```");
		expect(doc.html).toContain('<div class="diagram diagram-dot" data-diagram-type="dot">');
		expect(doc.html).toContain('<pre class="diagram-source dot"><code class="language-dot">');
		expect(doc.html).toContain("digraph G {\n  A -> B;\n}");
	});

	it("no convierte bloques de código normales (javascript/python)", async () => {
		const doc = await parseMarkdown(
			"```javascript\nconst x = 1;\n```\n\n```python\nprint('hola')\n```",
		);
		expect(doc.html).toContain('<pre><code class="language-javascript">');
		expect(doc.html).toContain('<pre><code class="language-python">');
		expect(doc.html).not.toContain('class="diagram');
	});

	it("soporta múltiples diagramas y escapa caracteres especiales de la fuente", async () => {
		const doc = await parseMarkdown(
			["```mermaid", "sequenceDiagram", "  A->>B: Hola", "```", "", "texto", "", "```dot", 'A -> "C <D> & E";', "```"].join(
				"\n",
			),
		);
		const dags = doc.html.match(/class="diagram diagram-/g) ?? [];
		expect(dags.length).toBe(2);
		// Caracteres especiales se escapan en el HTML de salida.
		expect(doc.html).toContain("&#x26;");
	});
});
