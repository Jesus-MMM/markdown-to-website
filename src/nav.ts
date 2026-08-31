import type { NavItem, Page } from "./types.js";

function pageToNav(page: Page, titleOverride?: string): NavItem {
	return {
		title: titleOverride ?? page.title,
		url: page.route ? `/${page.route}/` : "/",
		order: page.meta.order ?? Number.MAX_SAFE_INTEGER,
		isIndex: page.source.toLowerCase().endsWith("index.md"),
		children: [],
	};
}

function sortChildren(children: NavItem[]): void {
	children.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
	for (const child of children) {
		sortChildren(child.children);
	}
}

/**
 * Construye el árbol de navegación jerárquico a partir de las páginas.
 *
 * - Un `index.md` dentro de una carpeta define el título y la URL de esa
 *   sección (nodo contenedor), y las demás páginas de la carpeta se
 *   convierten en sus hijos.
 * - `index.md` en la raíz se convierte en el home.
 */
export function buildNav(pages: Page[]): NavItem[] {
	const root = new Map<string, NavItem>();
	const sections = new Map<string, NavItem>();

	const getOrCreateSection = (slug: string[]): NavItem => {
		const key = slug.join("/");
		let node = sections.get(key);
		if (node) return node;

		// Encuentra el padre (sección de nivel anterior) o la raíz.
		const parentSlug = slug.slice(0, -1);
		let parent: NavItem[];
		if (parentSlug.length === 0) {
			// Nodo de nivel superior: inserta en la raíz.
			const topKey = key;
			const existing = root.get(topKey);
			if (existing) {
				sections.set(key, existing);
				return existing;
			}
			node = {
				title: "",
				order: Number.MAX_SAFE_INTEGER,
				children: [],
			};
			root.set(topKey, node);
		} else {
			const parentNode = getOrCreateSection(parentSlug);
			parent = parentNode.children;
			node = {
				title: "",
				order: Number.MAX_SAFE_INTEGER,
				children: [],
			};
			parent.push(node);
		}
		sections.set(key, node);
		return node;
	};

	for (const page of pages) {
		const { slug } = page;
		const isRootHome = slug.length === 0 && page.source.toLowerCase() === "index.md";

		if (isRootHome) {
			// El home se coloca primero en la raíz.
			const homeNode = pageToNav(page);
			homeNode.order = Number.MIN_SAFE_INTEGER;
			root.set("__home__", homeNode);
			continue;
		}

		// Nodo contenedor de la sección (carpeta de nivel superior del slug).
		const isSection = page.source.toLowerCase().endsWith("index.md");
		if (isSection) {
			const section = getOrCreateSection(slug);
			const navItem = pageToNav(page);
			// Añade los metadatos SIN reemplazar `children` (que puede ya
			// contener páginas procesadas antes que el index.md).
			section.title = navItem.title;
			section.url = navItem.url;
			section.isIndex = true;
			// El índice de la sección se ordena antes que sus hijos.
			section.order = page.meta.order ?? 0;
			continue;
		}

		// Página normal: se anida bajo su sección padre.
		const parentSlug = slug.slice(0, -1);
		if (parentSlug.length === 0) {
			// Página en la raíz (sin carpeta, sin index): va directo a la raíz.
			const node = pageToNav(page);
			root.set(`page:${page.route}`, node);
		} else {
			const parent = getOrCreateSection(parentSlug);
			parent.children.push(pageToNav(page));
		}
	}

	const result = Array.from(root.values());
	sortChildren(result);
	return result;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function isActive(item: NavItem, currentRoute: string): boolean {
	const target = item.url && item.url !== "/" ? item.url.replace(/\/+$/, "") : "/";
	const cur = currentRoute && currentRoute !== "" ? `/${currentRoute.replace(/^\/+|\/+$/g, "")}` : "/";
	if (target === "/" || cur === "/") {
		return target === cur;
	}
	return cur === target || cur.startsWith(`${target}/`);
}

function renderItem(item: NavItem, currentRoute: string): string {
	const cls: string[] = [];
	if (isActive(item, currentRoute)) cls.push("active");
	if (item.isIndex) cls.push("section");
	const extra = cls.length ? ` class="${cls.join(" ")}"` : "";

	if (item.children.length === 0) {
		return `<li${extra}><a href="${escapeHtml(item.url ?? "#")}">${escapeHtml(item.title)}</a></li>`;
	}

	const link = item.url
		? `<a href="${escapeHtml(item.url)}"${extra}>${escapeHtml(item.title)}</a>`
		: `<span${extra}>${escapeHtml(item.title)}</span>`;

	const inner = renderList(item.children, currentRoute);
	return `<li class="has-children">${link}<ul>${inner}</ul></li>`;
}

function renderList(items: NavItem[], currentRoute: string): string {
	return items.map((item) => renderItem(item, currentRoute)).join("");
}

/**
 * Genera el HTML de la navegación. La página actual se resalta con
 * la clase CSS "active".
 */
export function renderNavHtml(items: NavItem[], currentRoute: string): string {
	return `<ul class="nav-menu">${renderList(items, currentRoute)}</ul>`;
}
