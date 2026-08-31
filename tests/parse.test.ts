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
});
