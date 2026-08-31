---
title: Bienvenido
order: 1
---

# md2site

Generador automático de sitios de documentación estáticos a partir de archivos **Markdown**, usando **plantillas por página** que tú mismo puedes definir.

Escribe tu contenido en Markdown, aporta tus plantillas HTML (con Handlebars) y `md2site` genera un sitio estático multipágina listo para alojar en GitHub Pages, Netlify, S3, etc.

## Cómo se organiza esta documentación

Esta misma carpeta `docs/` es un ejemplo vivo de la estructura que entiende el generador:

| Sección | Contenido |
|---------|-----------|
| [Guía](/guia/) | Instalación y primer uso |
| [Guías](/guias/) | Tutoriales paso a paso |
| [Referencia](/referencia/) | CLI, config, plantillas y formato de Markdown |
| [FAQ](/faq/) | Preguntas frecuentes |

## Características

- **Markdown → HTML** con soporte de `frontmatter` (título, orden, layout).
- **Navegación automática** a partir de la estructura de carpetas de `docs/`.
- **Rutas por carpetas**: `docs/guia/instalacion.md` → `/guia/instalacion/`.
- **Plantillas por página** con Handlebars: `layout.html` + `partials/`.
- **Assets automáticos** (`css/*.css`, `js/*.js`) con rutas relativas correctas.
- **Live-reload** en el servidor de desarrollo.

## Inicio rápido

```bash
md2site init    # crea la estructura base
md2site dev     # previsualiza con live-reload
md2site build   # genera el sitio estático
md2site serve   # sirve el build
```

Consulta [Guía de inicio](/guia/inicio-rapido/) para empezar.
