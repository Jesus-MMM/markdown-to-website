---
title: Estructura de los Markdown
order: 4
---

# Estructura de los Markdown

Cada archivo Markdown puede incluir un frontmatter YAML al inicio:

```markdown
---
title: Instalación      # título (si falta, se usa el primer H1)
order: 1                # orden en la navegación
layout: custom          # (opcional) layout distinto
hideNav: false          # (opcional) ocultar del índice
---

# Instalación

Paso 1: instala las dependencias.
```

## Navegación automática

La estructura de carpetas genera el menú:

| Archivo | Ruta generada | Rol |
|---------|---------------|-----|
| `docs/index.md` | `/` | Home. |
| `docs/guia/index.md` | `/guia/` | Título y URL de la sección "Guía". |
| `docs/guia/instalacion.md` | `/guia/instalacion/` | Página dentro de la sección. |

Reglas:

- Las **carpetas** se convierten en **secciones** anidadas.
- Un **`index.md`** dentro de cada carpeta define el título de la sección.
- El **orden** se toma de `order` (si falta, alfabético).
- El **ítem activo** se resalta con la clase `active`.
