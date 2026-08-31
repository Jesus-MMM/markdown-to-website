---
title: Configuración
order: 2
---

# Configuración

La configuración se define en `md2site.config.ts`:

```ts
export default {
  title: "Mi Documentación",
  lang: "es",
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
| `outDir` | string | `"dist"` | Carpeta de salida. |
| `docsDir` | string | `"docs"` | Carpeta de los Markdown. |
| `templatesDir` | string | `"templates"` | Carpeta de plantillas. |
| `dev.port` | number | `5173` | Puerto de desarrollo. |
| `dev.open` | boolean | `false` | Abre el navegador al iniciar `dev`. |
