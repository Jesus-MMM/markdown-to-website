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
 */
export async function parseMarkdown(raw: string): Promise<ParsedDocument> {
	const { content, data } = matter(raw);
	const meta = (data ?? {}) as PageMeta;

	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
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
