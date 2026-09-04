---
title: Diagramas
order: 5
---

# Diagramas

Página de ejemplo con diagramas Mermaid y DOT (Graphviz) renderizados en el
navegador, junto con bloques de código normales.

## Mermaid — graph TD

```mermaid
graph TD
  A[Usuario] --> B[Frontend]
  B --> C{¿Autenticado?}
  C -->|Sí| D[Dashboard]
  C -->|No| E[Login]
```

## Mermaid — sequenceDiagram

```mermaid
sequenceDiagram
  participant C as Cliente
  participant S as Servidor
  C->>S: GET /api
  S-->>C: 200 OK
  C->>S: POST /api
  S-->>C: 201 Created
```

## DOT (Graphviz)

```dot
digraph G {
  rankdir=LR;
  A -> B -> C;
  B -> D;
  C -> E;
}
```

## Múltiples diagramas en la misma página

```mermaid
flowchart TD
  I[Inicio] --> P{Decisión}
  P -- Sí --> A1[Acción 1]
  P -- No --> A2[Acción 2]
  A1 --> F[Fin]
  A2 --> F[Fin]
```

```dot
digraph Flow {
  start -> step1;
  step1 -> check;
  check -> step2 [label="ok"];
  check -> fix [label="error"];
  fix -> step1;
}
```

## Bloques de código normales (no son diagramas)

Los bloques `javascript`, `python`, `bash`, etc. se siguen mostrando como
código normal.

```javascript
function saluda(nombre) {
  return `Hola, ${nombre}!`;
}
```

```python
def saluda(nombre):
    return f"Hola, {nombre}!"
```
