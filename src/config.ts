import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { SiteConfig } from "./types.js";

const devSchema = z.object({
	port: z.number().int().positive().default(5173),
	open: z.boolean().default(false),
});
const defaultDev: z.output<typeof devSchema> = { port: 5173, open: false };

export const configSchema = z.object({
	title: z.string().min(1).default("Mi Documentación"),
	lang: z.string().default("es"),
	outDir: z.string().min(1).default("dist"),
	docsDir: z.string().min(1).default("docs"),
	templatesDir: z.string().min(1).default("templates"),
	dev: devSchema.default(defaultDev),
});

export type RawConfig = z.input<typeof configSchema>;

const CONFIG_FILENAMES = [
	"md2site.config.ts",
	"md2site.config.mjs",
	"md2site.config.js",
	"md2site.config.json",
];

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
	return {
		title: parsed.title,
		lang: parsed.lang,
		outDir: path.resolve(rootDir, parsed.outDir),
		docsDir: path.resolve(rootDir, parsed.docsDir),
		templatesDir: path.resolve(rootDir, parsed.templatesDir),
		dev: parsed.dev,
	};
}

async function importConfigFile(file: string): Promise<RawConfig> {
	try {
		if (path.extname(file) === ".json") {
			return JSON.parse(readFileSync(file, "utf8")) as RawConfig;
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
		const mod = (await import(url)) as {
			default?: RawConfig;
			config?: RawConfig;
		};
		if (mod && typeof mod === "object" && "default" in mod && mod.default) {
			return mod.default;
		}
		if (mod && typeof mod === "object" && mod.config) {
			return mod.config;
		}
		return {};
	} catch (err) {
		throw new Error(`No se pudo cargar la configuración de "${file}": ${(err as Error).message}`);
	}
}
