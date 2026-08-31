import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const isWindows = process.platform === "win32";
const binName = isWindows ? "md2site.exe" : "md2site";
const seaDir = path.join(ROOT, ".sea");

// 1) Regenerar el módulo embebido para que el binario incluya templates/scaffold.
execFileSync(process.execPath, [path.join(__dirname, "generate-embedded.mjs")], {
	stdio: "inherit",
	cwd: ROOT,
});

// 2) Bundle único con esbuild (CJS, autocontenido). Se usa CJS porque el main
//    injected de SEA solo permite require() de builtins para módulos CommonJS
//    (muchas deps del pipeline son CJS, p.ej. gray-matter). tsx/esbuild se
//    externalizan: el binario no necesita cargar config TS con tsx (usa data:
//    URL), y evita inlinear esbuild a sí mismo.
// eslint-disable-next-line no-undef
await build({
	entryPoints: [path.join(ROOT, "src", "cli.ts")],
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "node26",
	outfile: path.join(seaDir, "pre.cjs"),
	external: ["tsx", "esbuild", "node:sea"],
	define: { __MD2SITE_BINARY__: "true" },
	legalComments: "none",
	minify: true,
});

// 3) Config de SEA.
const mainFormat = "commonjs";
const seaConfig = {
	main: path.join(seaDir, "pre.cjs"),
	mainFormat,
	output: path.join(seaDir, binName),
	useCodeCache: false,
	disableExperimentalSEAWarning: true,
};
const seaConfigPath = path.join(seaDir, "sea-config.json");
await import("node:fs/promises").then((fs) =>
	fs.writeFile(seaConfigPath, JSON.stringify(seaConfig, null, 2), "utf8"),
);

// 4) Generar el ejecutable.
if (!existsSync(seaConfigPath)) throw new Error("sea-config no generado");
execFileSync(process.execPath, ["--build-sea", seaConfigPath], { stdio: "inherit", cwd: ROOT });

console.log(`\nBinario generado: ${path.join(seaDir, binName)}`);
