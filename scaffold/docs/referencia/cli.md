---
title: Comandos CLI
order: 1
---

# Comandos CLI

`md2site` expone los siguientes comandos:

| Comando | Descripción |
|---------|-------------|
| `init` | Genera la estructura base. |
| `build` | Compila los Markdown a HTML en `dist/`. |
| `dev` | Servidor de desarrollo con live-reload. |
| `serve [--port N]` | Sirve el build generado. |
| `--version` | Muestra la versión. |

## Ejemplos

```bash
md2site dev               # puerto por defecto 5173
md2site serve --port 9000 # servidor estático en el 9000
md2site build
```

## Salida

El comando `build` genera la salida por carpetas:

```
docs/guia/instalacion.md  →  dist/guia/instalacion/index.html
docs/guia/index.md        →  dist/guia/index.html
docs/index.md             →  dist/index.html
```
