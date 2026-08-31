---
title: Inicio rápido
order: 2
---

# Inicio rápido

Crea tu primera documentación en menos de un minuto.

## 1. Genera la estructura base

```bash
md2site init
```

Esto crea:

```
mi-proyecto/
├── docs
│   ├── faq.md
│   ├── guias
│   │   ├── crear-tema.md
│   │   └── index.md
│   ├── index.md
│   ├── inicio
│   │   ├── index.md
│   │   ├── inicio-rapido.md
│   │   └── instalacion.md
│   └── referencia
│       ├── cli.md
│       ├── configuracion.md
│       ├── estructura-markdown.md
│       ├── index.md
│       └── plantillas.md
├── md2site.config.ts
└── templates
    ├── css
    │   └── style.css
    ├── js
    │   └── main.js
    ├── layout.html
    └── partials
        ├── footer.html
        ├── header.html
        └── nav.html
```

## 2. Añade contenido

Crea archivos Markdown en `docs/`. Por ejemplo:

```markdown
# docs/instalacion.md

---
title: Instalación
order: 1
---

# Instalación

Paso 1: instala las dependencias.
```

## 3. Previsualiza

```bash
md2site dev
```

Abre `http://localhost:5173`. Cada cambio en `docs/` recarga la página al instante.

## 4. Genera y sirve el sitio

```bash
md2site build   # genera dist/
md2site serve   # sirve dist/ en http://localhost:8080
```
