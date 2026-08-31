export interface SiteConfig {
	title: string;
	lang: string;
	outDir: string;
	docsDir: string;
	templatesDir: string;
	dev: {
		port: number;
		open: boolean;
	};
}

export interface PageMeta {
	title?: string;
	order?: number;
	layout?: string;
	hideNav?: boolean;
	[key: string]: unknown;
}

export interface NavItem {
	title: string;
	url?: string;
	order: number;
	isIndex?: boolean;
	children: NavItem[];
}

export interface Page {
	/** Ruta de salida de la página, e.g. "guia/instalacion" (sin index.html, sin barras laterales). */
	route: string;
	/** Ruta relativa al archivo markdown dentro de docsDir. */
	source: string;
	/** Título efectivo de la página. */
	title: string;
	/** Frontmatter crudo completo. */
	meta: PageMeta;
	/** HTML del contenido markdown renderizado. */
	html: string;
	/** Jerarquía de la página dentro del árbol de docs (nombres de carpetas). */
	slug: string[];
}
