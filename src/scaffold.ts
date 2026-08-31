import path from "node:path";
import { promises as fs } from "node:fs";
import { writeEmbeddedFiles, scaffoldDocs, defaultTemplates } from "./embedded.js";

// Bandera definida en tiempo de build por esbuild al generar el binario SEA.
declare const __MD2SITE_BINARY__: boolean | undefined;
const isBinary =
	typeof __MD2SITE_BINARY__ !== "undefined" && __MD2SITE_BINARY__ === true;

// En el binario autocontenido no hay tsx, así que se genera la config en
// ESM puro (.mjs); en el paquete npm se puede usar TypeScript (.ts).
const CONFIG_FILENAME = isBinary ? "md2site.config.mjs" : "md2site.config.ts";

export { CONFIG_FILENAME };

const CONFIG_TEMPLATE = `export default {
  title: "M2W Documentación",
  lang: "es",
  base: "",
  outDir: "dist",
  docsDir: "docs",
  templatesDir: "templates",
  dev: { port: 5173, open: true },
};
`;

/**
 * Genera la estructura base de un proyecto dentro de `rootDir`:
 * docs/ (documentación de ejemplo), templates/ (plantilla moderna) y el
 * archivo de configuración.
 *
 * El contenido de ejemplo y las plantillas por defecto vienen del árbol
 * embebido (src/embedded.ts), de modo que el binario autocontenido puede
 * hacer `init` sin depender del repositorio.
 */
export async function scaffold(rootDir: string, outputDir?: string): Promise<void> {
	const targetDir = outputDir ? path.join(rootDir, outputDir) : rootDir;
	const configFile = path.join(targetDir, CONFIG_FILENAME);
	await safeWrite(configFile, CONFIG_TEMPLATE);

	const docsDir = path.join(targetDir, "docs");
	const templatesDir = path.join(targetDir, "templates");

	await writeEmbeddedFiles(scaffoldDocs, docsDir);
	await writeEmbeddedFiles(defaultTemplates, templatesDir);
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
