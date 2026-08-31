import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const CONFIG_TEMPLATE = `export default {
  title: "Mi Documentación",
  lang: "es",
  outDir: "dist",
  docsDir: "docs",
  templatesDir: "templates",
  dev: { port: 5173, open: true },
};
`;

// Raíz del paquete (src/..).
// scaffold.ts compilado vive en dist/, así que se resuelve la raíz del repo.
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Ruta a los archivos reales del proyecto que se copian en `init`.
const SCAFFOLD_DOCS_DIR = path.join(ROOT_DIR, "scaffold", "docs");
const DEFAULT_TEMPLATES_DIR = path.join(ROOT_DIR, "templates", "default");

/**
 * Copia recursivamente el contenido de un directorio a otro.
 */
async function copyDir(src: string, dest: string): Promise<void> {
	await fs.mkdir(dest, { recursive: true });
	const entries = await fs.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		const from = path.join(src, entry.name);
		const to = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			await copyDir(from, to);
		} else if (entry.isFile()) {
			await fs.copyFile(from, to);
		}
	}
}

/**
 * Genera la estructura base de un proyecto dentro del directorio actual:
 * docs/ (documentación de ejemplo), templates/ (plantilla moderna) y el
 * archivo de configuración.
 *
 * En vez de generar el contenido desde código, se copian los archivos reales
 * del repositorio: `scaffold/docs/` → docs/ y `templates/default/` → templates/.
 */
export async function scaffold(rootDir: string): Promise<void> {
	const configFile = path.join(rootDir, "md2site.config.ts");
	await safeWrite(configFile, CONFIG_TEMPLATE);

	const docsDir = path.join(rootDir, "docs");
	const templatesDir = path.join(rootDir, "templates");

	await copyDir(SCAFFOLD_DOCS_DIR, docsDir);
	await copyDir(DEFAULT_TEMPLATES_DIR, templatesDir);
}

/**
 * Escribe el archivo de configuración salvo que ya exista con contenido.
 */
async function safeWrite(file: string, content: string): Promise<void> {
	try {
		const existing = await fs.readFile(file, "utf8");
		if (existing.trim()) return; // no sobrescribir archivos existentes
	} catch {
		/* no existe: crear */
	}
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, content, "utf8");
}
