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
