# md2site

Generador automático de sitios de documentación estáticos a partir de archivos **Markdown**, usando **plantillas por página** que tú mismo puedes definir.

Escribe tu contenido en Markdown, aporta tus plantillas HTML (con Handlebars) y `md2site` genera un sitio estático multipágina listo para alojar en GitHub Pages, Netlify, S3, etc.

## Características

- **Markdown → HTML** con soporte de `frontmatter` (título, orden, layout, etc.).
- **Navegación automática** a partir de la estructura de carpetas de `docs/`: cada carpeta es una sección y cada `index.md` define el título y URL de esa sección.
- **Rutas por carpetas**: `docs/guia/instalacion.md` → `/guia/instalacion/index.html`.
- **Plantillas por página** con Handlebars: `layout.html` + `partials/` (header, nav, footer...), con override por página vía `layout` en el frontmatter.
- **Assets automáticos**: cualquier `css/*.css` y `js/*.js` en `templates/` se copian al build y se enlazan con rutas relativas correctas según la profundidad de cada página.
- **Live-reload**: servidor de desarrollo que recarga el navegador al editar markdown, plantillas o configuración.
- **Servidor estático** para servir el build generado.
- **Plantillas por defecto** responsivas incluidas — funciona de inmediato tras `init`.

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- [pnpm](https://pnpm.io) (gestor de paquetes)

## Instalación

```bash
# clonar y entrar al proyecto
git clone https://github.com/Jesus-MMM/markdown-to-website && cd markdown-to-website

# instalar dependencias
pnpm install

# compilar
pnpm build

# (opcional) vincular el comando md2site globalmente
pnpm link --global
```

Si no vinculas el paquete globalmente, ejecuta los comandos con:

```bash
node dist/cli.js <comando>
```

### Binario autónomo (SEA)

También puedes generar un **ejecutable autocontenido** (no requiere Node ni el repositorio
en el entorno de destino):

```bash
pnpm build:binary    # genera .sea/md2site
```

El binario incluye las plantillas por defecto y la documentación de ejemplo embebidas,
por lo que `init`, `build`, `dev` y `serve` funcionan de inmediato. Nota: su archivo de
configuración es `md2site.config.mjs` y solo admite **configs declarativos** (ver
[Configuración](#configuración-md2siteconfigts)).

## Inicio rápido

```bash
# 1. Genera la estructura base (docs + templates + config)
#    docs/ se crea con la documentación de ejemplo de md2site
md2site init

#    también puedes crear el proyecto en una carpeta nueva
md2site init -o mi-proyecto

# 2. Edita los archivos Markdown en docs/ (o sustituye por tu contenido)

# 3. Previsualiza con live-reload (http://localhost:5173)
md2site dev

# 4. Genera el sitio estático en dist/
md2site build

# 5. Sirve el build (http://localhost:8080)
md2site serve
```

## Comandos CLI

| Comando | Descripción |
|---------|-------------|
| `md2site init [-o DIR]` | Copia la estructura base: `docs/` (documentación de ejemplo), `templates/` (plantilla moderna) y crea el archivo de configuración. `-o`/`--output DIR` crea la estructura dentro de `DIR` (la carpeta se crea si no existe). |
| `md2site build` | Compila los Markdown a HTML estático en `dist/`. |
| `md2site dev` | Servidor de desarrollo con live-reload (puerto por defecto 5173). |
| `md2site serve [--port N]` | Sirve el build generado (puerto por defecto 8080). |
| `md2site --version` | Muestra la versión. |

## Estructura del proyecto

```
mi-proyecto/
├── md2site.config.ts        # configuración
├── docs/                    # tus archivos Markdown (init genera doc del proyecto)
│   ├── index.md             # → "/" (home)
│   ├── guia/
│   │   ├── index.md         # → "/guia/" (título de la sección)
│   │   ├── instalacion.md   # → "/guia/instalacion/"
│   │   └── usage.md         # → "/guia/usage/"
│   └── api/
│       └── endpoints.md     # → "/api/endpoints/"
└── templates/               # tus plantillas y assets
    ├── layout.html          # plantilla base de página (Handlebars)
    ├── partials/
    │   ├── header.html
    │   ├── nav.html
    │   └── footer.html
    ├── css/style.css        # se copia y enlaza automáticamente
    └── js/app.js            # idem
```

El comando `md2site init` genera una documentación de ejemplo completa del
propio `md2site` dentro de `docs/` (home, guía de instalación, guías/tutoriales,
referencia de CLI/config/plantillas/Markdown y FAQ), con su `frontmatter`,
jerarquía por carpetas y `index.md` por sección. Sírvela de referencia o
reemplázala con tu contenido.

## Configuración (`md2site.config.ts`)

```ts
export default {
  title: "Mi Documentación",
  lang: "es",
  base: "",
  outDir: "dist",
  docsDir: "docs",
  templatesDir: "templates",
  dev: { port: 5173, open: true },
};
```

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title` | string | `"Mi Documentación"` | Título del sitio. |
| `lang` | string | `"es"` | Atributo `lang` del HTML. |
| `base` | string | `""` | Prefijo de ruta (base path) del sitio. Necesario al servir bajo una subcarpeta (p.ej. GitHub Pages de proyecto: `/mi-repo`). Se aplica a la navegación, a los enlaces del contenido y a las plantillas. |
| `outDir` | string | `"dist"` | Carpeta de salida del build. |
| `docsDir` | string | `"docs"` | Carpeta de los archivos Markdown. |
| `templatesDir` | string | `"templates"` | Carpeta de plantillas y assets. |
| `dev.port` | number | `5173` | Puerto del servidor de desarrollo. |
| `dev.open` | boolean | `false` | Abre el navegador automáticamente al iniciar `dev`. |

El `base` también puede fijarse con la variable de entorno **`MD2SITE_BASE`**, que tiene prioridad
sobre el valor del archivo de configuración (muy útil en CI/CD, p.ej. GitHub Pages de proyecto).

Formato del archivo de configuración:

- **Paquete npm**: `md2site.config.ts` (TypeScript, con lógica y `import` permitidos).
- **Binario autónomo**: `md2site.config.mjs` (o `.js`/`.json`), **declarativo**: solo objetos literales `export default { ... }`, sin `import` ni lógica adicional. Un config con imports fallará en el binario con una advertencia clara.

## Estructura de los Markdown

Cada archivo Markdown puede incluir un `frontmatter` YAML al inicio:

```markdown
---
title: Instalación      # título de la página (si falta, se usa el primer H1)
order: 1                # orden en la navegación (alfabético si falta)
layout: custom          # (opcional) usa templates/custom.html en vez de layout.html
hideNav: false          # (opcional) controla la visibilidad en la navegación
---

# Instalación

Paso 1: instala las dependencias.
```

### Navegación automática

- Las **carpetas** se convierten en **secciones** (grupos anidados).
- Un **`index.md` dentro de una carpeta** define el título y URL de esa sección.
- `index.md` en la raíz de `docs/` es el home (`/`).
- El **orden** se toma de `order` del frontmatter (por defecto, alfabético).
- El **item activo** de la página actual se resalta con la clase `active`.

## Plantillas

Las plantillas usan **Handlebars**. El motor se llena con el contenido y los metadatos de cada página.

### Plantilla base: `templates/layout.html`

```html
<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{title}}{{#if site.title}} · {{site.title}}{{/if}}</title>
  {{#each assets.css}}<link rel="stylesheet" href="{{this}}">{{/each}}
</head>
<body>
  {{> header}}
  <div class="layout">
    <aside class="sidebar">{{> nav}}</aside>
    <main class="content">
      <article>{{{content}}}</article>
    </main>
  </div>
  {{> footer}}
  {{#each assets.js}}<script src="{{this}}"></script>{{/each}}
</body>
</html>
```

### Partials

Los archivos en `templates/partials/*.html` se registran como partials de Handlebars y se incluyen con `{{> nombre}}`:

- `header.html` → `{{> header}}`
- `nav.html` → `{{> nav}}` (inyecta el HTML de la navegación generada automáticamente)
- `footer.html` → `{{> footer}}`

### Override por página

Indica un layout distinto en el frontmatter de una página:

```markdown
---
title: Página especial
layout: especial
---
```

`especial.html` debe existir en `templates/`.

### Contexto disponible en cada plantilla

| Variable | Descripción |
|----------|-------------|
| `title` | Título de la página. |
| `content` | Contenido HTML renderizado del Markdown (usar `{{{content}}}` sin escapar). |
| `lang` | Idioma del sitio. |
| `site.title` / `site.*` | Valores globales de configuración. |
| `page.*` | Metadatos del frontmatter de la página. |
| `nav` | Árbol de navegación jerárquico (generado). |
| `navHtml` | HTML listo de la navegación (usar `{{{navHtml}}}`). |
| `currentRoute` | Ruta actual de la página. |
| `assets.css` / `assets.js` | Lista de assets enlazables (con rutas relativas correctas). |

### Plantillas por defecto

Si no aportas `templates/`, se usan las incluidas en `templates/default/` (tema moderno con modo claro/oscuro, búsqueda en la barra lateral, resaltado de código con botón de copiar, y layout responsive).

`md2site init` **genera** estas plantillas y los archivos de documentación de ejemplo desde el contenido embebido, en lugar de depender de archivos externos (por eso el binario autónomo puede hacer `init` sin el repositorio):

- `docs/` → documentación de ejemplo con la estructura correcta
- `templates/` → la plantilla moderna completa: `layout.html`, `partials/`, `css/`, `js/`

## Comandos del proyecto

```bash
pnpm build         # compila TypeScript a dist/
pnpm build:binary  # genera el binario autónomo (SEA) en .sea/
pnpm typecheck     # verifica tipos sin emitir
pnpm test          # ejecuta los tests Vitest
pnpm dev           # atajo: ejecuta el CLI dev con tsx
```

## Desarrollo

Estructura del código:

```
src/
├── cli.ts              # comandos init/build/dev/serve
├── config.ts           # lectura y validación de config (zod)
├── loader.ts           # descubrimiento del árbol de docs/
├── parse.ts            # Markdown→HTML + frontmatter (gray-matter + remark)
├── nav.ts              # índice jerárquico automático + render del nav
├── template.ts         # motor Handlebars (layout + partials)
├── assets.ts           # descubrimiento de assets y rutas relativas
├── build.ts            # salida por carpetas + copia de assets
├── dev.ts              # servidor de desarrollo con live-reload (SSE)
├── serve.ts            # servidor estático del build
├── scaffold.ts         # estructura generada por `init`
├── embedded.ts         # contenido embebido (plantillas + docs de ejemplo) para el binario
└── types.ts            # tipos compartidos
tests/                  # tests Vitest (loader, parse, nav, render)
templates/default/      # plantillas por defecto
```

## Alojamiento del sitio generado

El contenido de `dist/` es HTML estático puro, por lo que puede alojarse en cualquier servicio:

- **GitHub Pages**: apunta la carpeta `dist/` (o sube su contenido a una rama `gh-pages`).
- **Netlify / Vercel**: usa `dist/` como carpeta de publicación en el build.
- **S3 / cualquier CDN**: sube el contenido de `dist/`.

## Licencia

MIT
