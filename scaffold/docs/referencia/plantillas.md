---
title: Plantillas
order: 3
---

# Plantillas

Las plantillas usan **Handlebars**. El motor se llena con el contenido y los metadatos de cada página.

## Plantilla base: `templates/layout.html`

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

## Partials

Los archivos en `templates/partials/*.html` se incluyen con `{{> nombre}}`:

- `header.html` → `{{> header}}`
- `nav.html` → `{{> nav}}`
- `footer.html` → `{{> footer}}`

## Override por página

En el frontmatter de una página puedes elegir un layout distinto:

```markdown
---
title: Página especial
layout: especial
---
```

`especial.html` debe existir en `templates/`.

## Contexto disponible

Ver la tabla completa en [Guías → Crear un tema](/guias/crear-tema/).
