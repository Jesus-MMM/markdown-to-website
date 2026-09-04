---
title: Diagramas
order: 1
---

# Diagramas

Esta página verifica la renderización de diagramas Mermaid y Graphviz (DOT) junto con bloques de código normales.

## Mermaid — graph TD

```mermaid
graph TD
  A[Usuario] --> B[Frontend]
  B --> C{¿Autenticado?}
  C -->|Sí| D[Dashboard]
  C -->|No| E[Login]
```

Texto intermedio.

## Mermaid — sequenceDiagram

```mermaid
sequenceDiagram
  participant A as Cliente
  participant B as Servidor
  A->>B: GET /api
  B-->>A: 200 OK
  A->>B: DELETE /api
  B-->>A: 204 No Content
```

## DOT (Graphviz)

```dot
digraph G {
  rankdir=LR;
  A -> B -> C;
  B -> D;
}
```

## Múltiples diagramas en la misma página

Aquí hay dos diagramas Mermaid consecutivos:

```mermaid
graph LR
  I[Inicio] --> P[Proceso]
  P --> F[Fin]
```

```mermaid
flowchart TD
  A[Objetivo] --> B{Decisión}
  B -- Sí --> C[Acción 1]
  B -- No --> D[Acción 2]
```

Y un DOT al final:

```dot
digraph Flow {
  start -> step1 -> check;
  check -> step2 [label="ok"];
  check -> fix [label="error"];
  fix -> step1;
}
```

## Bloques de código normales (no diagramas)

Estos deben seguir mostrándose como código.

```javascript
function saluda(nombre) {
  return `Hola, ${nombre}!`;
}
```

```python
def saluda(nombre):
    return f"Hola, {nombre}!"
```
