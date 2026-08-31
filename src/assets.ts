import path from "node:path";
import { promises as fs } from "node:fs";

export interface AssetBundle {
	/** Archivos CSS localizados (rutas absolutas). */
	css: string[];
	/** Archivos JS localizados (rutas absolutas). */
	js: string[];
}

const CSS_DIRS = ["css", "styles", "assets/css"];
const JS_DIRS = ["js", "scripts", "assets/js"];

/**
 * Descubre los assets de estilo/scripts del usuario dentro del directorio
 * de plantillas. Si no hay carpetas dedicadas, no devuelve nada.
 */
export async function discoverAssets(templatesDir: string): Promise<AssetBundle> {
	const bundle: AssetBundle = { css: [], js: [] };
	const root = path.resolve(templatesDir);

	async function scan(candidates: string[], target: string[]): Promise<void> {
		for (const dir of candidates) {
			const abs = path.join(root, dir);
			try {
				const files = await fs.readdir(abs);
				for (const file of files) {
					if (target === bundle.css ? /\.css$/i.test(file) : /\.js$/i.test(file)) {
						target.push(path.join(abs, file));
					}
				}
			} catch {
				/* carpeta no existe: ignorar */
			}
		}
	}

	await scan(CSS_DIRS, bundle.css);
	await scan(JS_DIRS, bundle.js);

	// Orden estable.
	bundle.css.sort();
	bundle.js.sort();
	return bundle;
}

/**
 * Convierte una ruta absoluta de asset en una ruta relativa al enlace
 * desde una página situada a la profundidad indicada por `slug`.
 *
 * Ejemplo: asset "templates/css/style.css", página de 2 niveles
 * (guia/instalacion) → "../../css/style.css".
 */
export function assetRelPath(assetAbsPath: string, templatesDir: string, depth: number): string {
	const rel = path.relative(templatesDir, assetAbsPath).replaceAll("\\", "/");
	const prefix = depth === 0 ? "." : "../".repeat(depth).replace(/\/$/, "");
	return `${prefix}/${rel}`;
}

/**
 * Prepara el objeto `assets` (css/js) con rutas relativas correctas para
 * una página dada según su profundidad (número de carpetas de su ruta).
 */
export function bundleForPage(bundle: AssetBundle, templatesDir: string, depth: number): {
	css: string[];
	js: string[];
} {
	const css = bundle.css.map((f) => assetRelPath(f, templatesDir, depth));
	const js = bundle.js.map((f) => assetRelPath(f, templatesDir, depth));
	return { css, js };
}
