---
title: Crear y personalizar un tema
order: 1
---

# Crear y personalizar un tema

Esta guía te muestra cómo adaptar `md2site` a tu propio diseño.

## Estructura de plantillas

En `templates/` puedes definir:

```
templates/
├── layout.html          # plantilla base de página (Handlebars)
├── partials/
│   ├── header.html      # barra superior
│   ├── nav.html         # navegación
│   └── footer.html      # pie de página
├── css/style.css        # estilos
└── js/app.js            # scripts (opcional)
```

## El contexto disponible

Cada plantilla recibe variables del motor:

| Variable | Descripción |
|----------|-------------|
| `{{title}}` | Título de la página. |
| `{{{content}}}` | Contenido HTML del Markdown (sin escapar). |
| `{{site.title}}` | Título global del sitio. |
| `{{{navHtml}}}` | Navegación automática ya generada. |
| `{{#each assets.css}}` | Lista de CSS a enlazar. |

## El partial de navegación

En `partials/nav.html` **no** escribas la lista a mano; inyecta el árbol generado:

```html
<nav class="sidebar-nav">{{{navHtml}}}</nav>
```

El motor emite las clases `.nav-menu`, `.has-children`, `a.active` y `.section` que puedes estilizar.

## CSS responsive

Tu `css/style.css` debe adaptarse a móvil y escritorio. Ejemplo mínimo:

```css
.layout { display: flex; gap: 2rem; }
.sidebar { flex: 0 0 250px; }
.content { flex: 1; }
@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; }
}
```
