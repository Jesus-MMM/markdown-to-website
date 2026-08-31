import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function collectFiles(dir, rel = "") {
	const out = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });
	entries.sort((a, b) => a.name.localeCompare(b.name));
	for (const entry of entries) {
		const abs = path.join(dir, entry.name);
		const relPath = rel ? `${rel}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			out.push(...(await collectFiles(abs, relPath)));
		} else {
			const content = await fs.readFile(abs, "utf8");
			out.push({ filePath: relPath, content });
		}
	}
	return out;
}

// JSON.stringify ya escapa caracteres no ASCII como \uXXXX de forma segura.
const serialize = (files) => JSON.stringify(files, null, "\t");

async function main() {
	const scaffoldDocs = await collectFiles(path.join(ROOT, "scaffold", "docs"));
	const defaultTemplates = await collectFiles(path.join(ROOT, "templates", "default"));

	const out = `// GENERADO AUTOMÁTICAMENTE por scripts/generate-embedded.mjs — NO editar a mano.
// Embele los archivos de templates/default y scaffold/docs dentro del bundle para
// que el binario (SEA) sea autocontenido y pueda hacer init/build sin el repositorio.

import path from "node:path";
import { promises as fs } from "node:fs";

export interface EmbeddedFile {
	filePath: string;
	content: string;
}

export const scaffoldDocs: EmbeddedFile[] = ${serialize(scaffoldDocs)};

export const defaultTemplates: EmbeddedFile[] = ${serialize(defaultTemplates)};

export function writeEmbeddedFiles(files: EmbeddedFile[], rootDir: string): Promise<void> {
	return writeAll(files, rootDir);
}

async function writeAll(files: EmbeddedFile[], rootDir: string): Promise<void> {
	for (const f of files) {
		const target = path.join(rootDir, f.filePath);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, f.content, "utf8");
	}
}
`;

	await fs.writeFile(path.join(ROOT, "src", "embedded.ts"), out, "utf8");
	console.log("generado src/embedded.ts");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
