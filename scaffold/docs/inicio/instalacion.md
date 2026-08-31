---
title: Requisitos e instalación
order: 1
---

# Requisitos e instalación

## Requisitos previos

Antes de instalar `md2site` asegúrate de tener:

- [Node.js](https://nodejs.org) **20 o superior**
- [pnpm](https://pnpm.io) como gestor de paquetes

## Instalación

```bash
# clonar el proyecto
git clone <tu-repo> markdown-to-website
cd markdown-to-website

# instalar dependencias
pnpm install

# compilar
pnpm build

# (opcional) vincular el comando globalmente
pnpm link --global
```

## Verificar la instalación

```bash
md2site --version
```

Deberías ver la versión instalada. Si aún no has vinculado el paquete, usa:

```bash
node dist/cli.js --version
```
