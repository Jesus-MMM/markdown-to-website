import process from "node:process";
import { loadConfig } from "./config.js";
import { build } from "./build.js";
import { scaffold, CONFIG_FILENAME } from "./scaffold.js";
import { startDev } from "./dev.js";
import { startStaticServer } from "./serve.js";

const HELP = `
md2site 0.3.0

Generador automático de sitios de documentación estáticos a partir de Markdown.

Uso:
  md2site <comando> [opciones]

Comandos:
  init [-o DIR]     Genera una estructura base (docs + templates + config)
                    -o, --output DIR  genera la estructura dentro de DIR (la carpeta se crea si no existe)
  build               Compila los markdowns a HTML estático en dist/
  dev                 Inicia el servidor de desarrollo con live-reload
  serve [--port N]    Sirve el build ya generado
  help                Muestra esta ayuda

Opciones globales:
  -h, --help          Muestra esta ayuda
  -v, --version       Muestra la versión
`;

async function main(argv: string[]): Promise<number> {
	const args = argv.slice(2);
	const cwd = process.cwd();

	if (args.length === 0 || args[0] === "help") {
		process.stdout.write(HELP);
		return 0;
	}
	if (args[0] === "-h" || args[0] === "--help") {
		process.stdout.write(HELP);
		return 0;
	}
	if (args[0] === "-v" || args[0] === "--version") {
		process.stdout.write("md2site 0.3.0\n");
		return 0;
	}

	const command = args[0];
	const rest = args.slice(1);

	try {
		switch (command) {
			case "init": {
				const outputDir = parseOutput(rest);
				await scaffold(cwd, outputDir);
				const where = outputDir ? outputDir : "en el directorio actual";
				process.stdout.write(
					`Estructura inicial creada ${where}:\n  docs/  templates/  ${CONFIG_FILENAME}\n` +
						"Edita los Markdowns en docs/ y tus plantillas en templates/, luego ejecuta:\n" +
						"  md2site dev   # previsualizar con live-reload\n  md2site build # generar el sitio estático\n",
				);
				return 0;
			}
			case "build": {
				const config = await loadConfig(cwd);
				const result = await build(config);
				process.stdout.write(
					`Build completado: ${result.pages} página(s) generadas en ${result.outDir}\n`,
				);
				return 0;
			}
			case "dev": {
				const config = await loadConfig(cwd);
				const port = config.dev.port;
				const server = await startDev(config);
				await new Promise<void>((resolve) => server.listen(port, () => resolve()));
				process.stdout.write(
					`Servidor de desarrollo en http://localhost:${port}\n` +
						`(live-reload activo; Ctrl+C para detener)\n`,
				);
				await new Promise<void>(() => {
					/* mantenerse vivo */
				});
				return 0;
			}
			case "serve": {
				const config = await loadConfig(cwd);
				const port = parsePort(rest);
				const server = await startStaticServer(config.outDir, port);
				await new Promise<void>((resolve) => server.listen(port, () => resolve()));
				process.stdout.write(
					`Sirviendo ${config.outDir} en http://localhost:${port}\n` +
						`(Ctrl+C para detener)\n`,
				);
				await new Promise<void>(() => {
					/* mantenerse vivo */
				});
				return 0;
			}
			default: {
				process.stderr.write(`Comando desconocido: "${command}"\n`);
				process.stderr.write(HELP);
				return 1;
			}
		}
	} catch (err) {
		process.stderr.write(`Error: ${(err as Error).message}\n`);
		return 1;
	}
}

function parsePort(rest: string[]): number {
	for (let i = 0; i < rest.length; i += 1) {
		if (rest[i] === "--port") {
			const value = Number(rest[i + 1]);
			if (Number.isFinite(value) && value > 0) return value;
		}
	}
	return 8080;
}

function parseOutput(rest: string[]): string | undefined {
	for (let i = 0; i < rest.length; i += 1) {
		if (rest[i] === "-o" || rest[i] === "--output") {
			return rest[i + 1];
		}
	}
	return undefined;
}

// En el binario SEA (bundle CJS, mainFormat commonjs) el guard usa la bandera
// de build; en el paquete npm (dist/cli.js ESM) se compara import.meta.url.
declare const __MD2SITE_BINARY__: boolean | undefined;
const isBinary =
	typeof __MD2SITE_BINARY__ !== "undefined" && __MD2SITE_BINARY__ === true;

if (isBinary || import.meta.url === `file://${process.argv[1]}`) {
	// Sin top-level await (el bundle CJS del binario no lo soporta).
	void main(process.argv).then(
		(code) => process.exit(code),
		(err) => {
			process.stderr.write(`Error: ${(err as Error).message}\n`);
			process.exit(1);
		},
	);
}
