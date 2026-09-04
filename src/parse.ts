import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { PageMeta } from "./types.js";

export interface ParsedDocument {
	content: string;
	meta: PageMeta;
	title: string;
	html: string;
}

const firstHeading = /<h1[^>]*>([\s\S]*?)<\/h1>/i;

/**
 * Convierte un string markdown a un documento parseado: extrae el
 * frontmatter (YAML), renderiza el contenido a HTML y deduce el título
 * (desde `title` del frontmatter o el primer H1 del markdown).
 *
 * Si se indica `base`, los enlaces e imágenes con ruta absoluta interna
 * (empezando por "/") se reescriben prefijando el base path del sitio.
 */
export async function parseMarkdown(raw: string, base = ""): Promise<ParsedDocument> {
	const { content, data } = matter(raw);
	const meta = (data ?? {}) as PageMeta;

	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(() => rehypeDiagrams())
		.use(() => rehypeBasePath(base))
		.use(rehypeStringify)
		.process(content);

	const html = String(file);

	let title = meta.title?.trim();
	if (!title) {
		const m = firstHeading.exec(html);
		if (m) {
			title = m[1].replace(/<[^>]+>/g, "").trim();
		}
	}
	if (!title) {
		title = "";
	}

	return { content, meta, title, html };
}

interface HastNode {
	type?: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
	/** Texto de un nodo de tipo "text". */
	value?: string;
}

/**
 * Devuelve los hijos que son elementos (type === "element").
 */
function elementsOf(node: HastNode): HastNode[] {
	return (node.children ?? []).filter((c) => c.type === "element");
}

/**
 * Extrae el texto plano de un subárbol hast (contenido de un bloque de código),
 * separando los saltos de línea entre nodos para no perder la estructura.
 */
function nodeText(node: HastNode): string {
	if (node.type === "text") return String(node.value ?? "");
	if (!node.children) return "";
	return node.children.map(nodeText).join("");
}

/**
 * Plugin de rehype que detecta los bloques de código con lenguaje `mermaid`
 * o `dot` (Graphviz) y los convierte en la estructura HTML que el renderizador
 * de diagramas espera en el cliente.
 *
 * Mermaid → <div class="diagram diagram-mermaid"><pre class="mermaid">…</pre></div>
 *   La clase `pre.mermaid` es el punto de entrada nativo de Mermaid 11.
 *
 * DOT     → <div class="diagram diagram-dot" data-diagram-type="dot"><pre
 *            class="diagram-source dot"><code class="language-dot">…</code></pre></div>
 *   El código fuente se conserva (con clase diagram-source) para que JavaScript
 *   lea el DOT, lo convierta a SVG y, en caso de error, quede como respaldo.
 *
 * Los bloques de código de cualquier otro lenguaje no se tocan y siguen
 * mostrándose como código normal.
 */
function rehypeDiagrams(): (tree: HastNode) => void {
	return (tree) => {
		walk(tree.children);
	};

	// Recorre el árbol; en cada lista de hijos reemplaza los <pre> que sean
	// diagramas por su correspondiente <div class="diagram">.
	function walk(children: HastNode[] | undefined): void {
		if (!children) return;
		for (const child of children) {
			if (child.type === "element") walk(child.children);
		}

		for (let i = 0; i < children.length; i++) {
			const pre = children[i];
			if (pre.type !== "element" || pre.tagName !== "pre") continue;
			const repl = diagramReplacement(pre);
			if (repl) children[i] = repl;
		}
	}
}

/**
 * Devuelve la estructura <div class="diagram"> equivalente a un <pre> de código
 * que sea un diagrama (mermaid/dot). Devuelve null si no es un diagrama.
 */
function diagramReplacement(pre: HastNode): HastNode | null {
	const codeEl = elementsOf(pre).find(
		(c) => c.tagName === "code" && hasClass(c, /^language-(mermaid|dot)$/),
	);
	if (!codeEl) return null;

	const lang = classNameOf(codeEl).match(/^language-(mermaid|dot)$/)?.[1] as
		| "mermaid"
		| "dot"
		| undefined;
	if (!lang) return null;
	const source = nodeText(codeEl).replace(/\n$/, "");

	return buildDiagramNode(lang, source);
}

interface HastElement extends HastNode {
	type: "element";
	tagName: string;
	properties: Record<string, unknown>;
}

function classNameOf(node: HastNode): string {
	const p = (node.properties ?? {}) as Record<string, unknown>;
	const v = p.className;
	if (Array.isArray(v)) return v.join(" ");
	return String(v ?? "");
}

function hasClass(node: HastNode, re: RegExp): boolean {
	return re.test(classNameOf(node));
}

/**
 * Construye el elemento <div class="diagram ..."> correspondiente.
 */
function buildDiagramNode(
	lang: "mermaid" | "dot",
	source: string,
): HastElement {
	if (lang === "mermaid") {
		// <pre class="mermaid"> con el código fuente como texto plano.
		const pre = describeElement("pre", { className: ["mermaid"] });
		pre.children = [{ type: "text", value: source }];
		return describeElement("div", { className: ["diagram", "diagram-mermaid"] }, [
			pre,
		]);
	}

	// DOT: conservamos el <pre class="diagram-source"><code> como fuente
	// (respaldo + entrada para que JS lea el DOT y lo convierta a SVG).
	const code = describeElement("code", { className: ["language-dot"] });
	code.children = [{ type: "text", value: source }];
	const pre = describeElement("pre", { className: ["diagram-source", "dot"] }, [
		code,
	]);

	return describeElement(
		"div",
		{
			className: ["diagram", "diagram-dot"],
			properties: { "data-diagram-type": "dot" },
		},
		[pre],
	);
}

function describeElement(
	tagName: string,
	props: {
		className?: string[];
		properties?: Record<string, unknown>;
	},
	children: HastNode[] = [],
): HastElement {
	return {
		type: "element",
		tagName,
		properties: {
			...(props.className ? { className: props.className } : {}),
			...(props.properties ?? {}),
		},
		children,
	};
}

/**
 * Plugin de rehype que prefija el base path del sitio a los atributos `href`
 * y `src` con ruta absoluta interna (empiezan por "/"). No toca URLs
 * externas (http/https), anclas (#) ni rutas relativas.
 */
function rehypeBasePath(base: string): (tree: HastNode) => void {
	return (tree) => {
		if (!base) return;

		const visit = (node: HastNode): void => {
			if (node.type === "element" && node.properties) {
				for (const key of ["href", "src"] as const) {
					const value = node.properties[key];
					if (typeof value !== "string") continue;
					if (!value.startsWith("/")) continue;
					if (value.startsWith("//")) continue; // protocol-relative: no tocar
					node.properties[key] = `${base}${value}`;
				}
			}
			if (node.children) {
				for (const child of node.children) visit(child);
			}
		};

		visit(tree);
	};
}
