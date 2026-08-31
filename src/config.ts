import path from "node:path";
import { Module } from "node:module";
import { existsSync, promises as fs } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { SiteConfig } from "./types.js";

// Bandera definida en tiempo de build por esbuild al generar el binario SEA.
declare const __MD2SITE_BINARY__: boolean | undefined;
const isBinary =
	typeof __MD2SITE_BINARY__ !== "undefined" && __MD2SITE_BINARY__ === true;

const devSchema = z.object({
	port: z.number().int().positive().default(5173),
	open: z.boolean().default(false),
});
const defaultDev: z.output<typeof devSchema> = { port: 5173, open: false };

export const configSchema = z.object({
	title: z.string().min(1).default("Mi Documentación"),
	lang: z.string().default("es"),
	base: z.string().default(""),
	outDir: z.string().min(1).default("dist"),
	docsDir: z.string().min(1).default("docs"),
	templatesDir: z.string().min(1).default("templates"),
	dev: devSchema.default(defaultDev),
});

export type RawConfig = z.input<typeof configSchema>;

// En el binario autocontenido no se soporta config en TypeScript (no hay
// tsx/esbuild); se usan MJS/JS/JSON. El paquete npm sí soporta .ts.
const CONFIG_FILENAMES = isBinary
	? ["md2site.config.mjs", "md2site.config.js", "md2site.config.json"]
	: ["md2site.config.ts", "md2site.config.mjs", "md2site.config.js", "md2site.config.json"];

/**
 * Carga y valida la configuración del proyecto.
 * Busca un archivo de config en el directorio raíz. Si no existe,
 * devuelve la configuración por defecto.
 */
export function loadConfig(rootDir: string): Promise<SiteConfig> {
	return Promise.resolve().then(async () => {
		for (const name of CONFIG_FILENAMES) {
			const file = path.join(rootDir, name);
			if (existsSync(file)) {
				const loaded = await importConfigFile(file);
				return normalizeConfig(loaded, rootDir);
			}
		}
		return normalizeConfig({}, rootDir);
	});
}

function normalizeConfig(raw: RawConfig, rootDir: string): SiteConfig {
	const parsed = configSchema.parse(raw);
	// La env var MD2SITE_BASE sobrescribe el base de la config (útil en CI).
	const base = normalizeBase(process.env.MD2SITE_BASE ?? parsed.base);
	return {
		title: parsed.title,
		lang: parsed.lang,
		base,
		outDir: path.resolve(rootDir, parsed.outDir),
		docsDir: path.resolve(rootDir, parsed.docsDir),
		templatesDir: path.resolve(rootDir, parsed.templatesDir),
		dev: parsed.dev,
	};
}

/**
 * Normaliza un base path: garantiza la barra inicial, elimina la barra final
 * y las barras duplicadas. "/markdown-to-website/" → "/markdown-to-website".
 */
function normalizeBase(base: string): string {
	const trimmed = base.trim();
	if (!trimmed) return "";
	const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	const noTrailing = withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
	return noTrailing.replace(/\/+/g, "/").replace(/\/$/, "");
}

async function importConfigFile(file: string): Promise<RawConfig> {
	try {
		if (path.extname(file) === ".json") {
			return JSON.parse(await fs.readFile(file, "utf8")) as RawConfig;
		}

		if (isBinary) {
			// En SEA, import() no lee del filesystem (data: URLs fallan con
			// "No such built-in module"), así que el config se evalúa
			// transformando el ESM declarativo a CommonJS y compilándolo
			// sin tocar disco ni activar flags experimentales.
			const text = await fs.readFile(file, "utf8");
			return evalEsmConfig(text, file);
		}

		if (path.extname(file) === ".ts") {
			// Registra el loader de tsx para poder importar config en TS.
			try {
				await import("tsx/esm");
			} catch {
				/* tsx no disponible: se intentará el import directo */
			}
		}
		const url = pathToFileURL(file).href;
		const mod = (await import(url)) as { default?: RawConfig; config?: RawConfig };
		return pickConfig(mod);
	} catch (err) {
		throw new Error(`No se pudo cargar la configuración de "${file}": ${(err as Error).message}`);
	}
}

function pickConfig(mod: Record<string, unknown>): RawConfig {
	if (mod.config) return unwrapDefault(mod.config);
	return unwrapDefault(mod);
}

/**
 * Desenvuelve el objeto de configuración real desde el namespace de un
 * módulo. Cuando se transpila `export default { ... }` (tsx interop CJS/ESM),
 * el namespace llega con capas anidadas: `{ default: { default: {...} } }` o
 * `{ default: {...}, "module.exports": {...} }`. Se bajan las capas de
 * `default`/`module.exports` hasta llegar al objeto de configuración.
 */
function unwrapDefault(value: unknown): RawConfig {
	let cur = value;
	while (cur && typeof cur === "object") {
		const record = cur as Record<string, unknown>;
		const next =
			(typeof record.default === "object" && record.default !== null)
				? record.default
				: (record["module.exports"] as unknown);
		if (next && typeof next === "object") {
			// Evita bucle si default apunta a sí mismo.
			if (next === cur) break;
			cur = next;
			continue;
		}
		break;
	}
	if (cur && typeof cur === "object" && !Array.isArray(cur)) {
		const record = cur as Record<string, unknown>;
		// Si tras desenvolver seguimos con un objeto que solo contiene
		// `default` (nombre de campo, no interop), es un caso raro: se deja.
		return record as RawConfig;
	}
	return {};
}

/**
 * Evalúa un config ESM declarativo en el binario autocontenido (SEA).
 * Solo soporta `export default { ... }` sin imports ni lógica adicional.
 * Devuelve el objeto exportado.
 */
function evalEsmConfig(text: string, filename: string): RawConfig {
	const cjs = text.replace(/^export\s+default\s+/m, "module.exports = ");

	// Módulo CommonJS programático (sin tocar el filesystem). _compile y
	// _nodeModulePaths son APIs internas de Node, no expuestas en los tipos TS.
	interface CommonJsModule extends Module {
		_compile(code: string, filename: string): void;
		paths: string[];
	}
	const moduleCtor = Module as unknown as {
		new (filename: string): CommonJsModule;
		_nodeModulePaths(from: string): string[];
	};
	const mod = new moduleCtor(filename);
	mod.filename = filename;
	mod.paths = moduleCtor._nodeModulePaths(path.dirname(filename));
	try {
		mod._compile(cjs, filename);
	} catch (err) {
		const importLine = text
			.split("\n")
			.find((line) => line.trim().startsWith("import "));
		const hint = importLine
			? " El binario autocontenido solo soporta configs declarativos 'export default { ... }' sin imports ni lógica."
			: "";
		throw new Error(`No se pudo evaluar el config ESM: ${(err as Error).message}${hint}`);
	}
	return mod.exports as RawConfig;
}
