---
title: Preguntas frecuentes
order: 5
---

# Preguntas frecuentes

## ¿Cómo cambio el título del sitio?

Edita el campo `title` en `md2site.config.ts`.

## ¿Cómo añado una nueva sección?

Crea una carpeta en `docs/` con un `index.md` y los archivos que quieras:

```bash
mkdir -p docs/nueva-seccion
echo "# Nueva sección" > docs/nueva-seccion/index.md
echo "# Página de ejemplo" > docs/nueva-seccion/ejemplo.md
```

## ¿Las rutas son por carpetas?

Sí. `docs/ruta/pagina.md` genera `/ruta/pagina/`.

## ¿Puedo usar mi propio diseño?

Sí. Coloca tus plantillas en `templates/`. Ver [Plantillas](/referencia/plantillas/).

## ¿Dónde está el código fuente del generador?

La documentación de esta carpeta describe el funcionamiento; el código está en

- `src/` — lógica del generador (CLI, loader, parse, nav, template, build, dev).
- `tests/` — tests Vitest.
