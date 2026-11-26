# Estación Café

Carta digital y sistema de pedidos de **Estación Café — cafetería sobre ruedas**. Los clientes eligen productos de la carta oficial (con tamaños, extras y precios en soles), escriben su nombre y confirman con Yape o Plin. Cada pedido queda guardado en una base de datos, y el equipo lo ve en un panel de administración con cola en vivo, timbre y reportes de ganancias por día y mes.

## Funcionalidades

- **Carta en 5 pestañas**: Espresso Bar, Otros Blends, Bebidas Heladas, Salados y Dulces, más extras rápidos (shot, chantillí, leche vegetal, jarabe).
- **Identidad visual**: fondo crema con el logo repetido como collage/marca de agua (7 % de opacidad, inclinado) y fotos de Unsplash servidas optimizadas por Netlify Image CDN.
- **Pedidos**: carrito con tamaños y extras; al confirmar se guarda fecha/hora, nombre, detalle, total, método (Yape/Plin) y estado (`Pendiente` / `Pagado/Entregado`). Los precios se recalculan en el servidor.
- **Panel Admin** (botón discreto “Admin” en el pie de página o `/#admin`, contraseña `admin123`):
  - Cola de pedidos en tiempo real (actualiza cada 5 s) con timbre al llegar un pedido nuevo y botón para marcar *Pagado/Entregado*.
  - Calendario mensual con ganancias por día, detalle de pedidos y totales del mes; solo suman los pedidos pagados/entregados.

## Tecnologías

- React 19 + Vite (frontend estático en `dist/`)
- Netlify Server con Hono (`netlify/server/index.ts`, rutas `/api/*`)
- Netlify Database (Postgres) + Drizzle ORM
- Netlify Image CDN para fotos y logo

## Desarrollo local

```bash
npm install
netlify dev --port 8889
```

`netlify dev` sirve la web, el servidor `/api/*`, la base de datos local y el Image CDN.

## Configuración

- Contraseña de admin: por defecto `admin123`. Puedes cambiarla sin tocar código definiendo la variable de entorno `ADMIN_PASSWORD`.
- Número de Yape/Plin a mostrar en la confirmación: `src/config.ts` → `PAYMENT.phone`.
- Carta y precios: `src/menu.ts` (precios en céntimos).
- Cambios en la tabla de pedidos: edita `db/schema.ts` y ejecuta `npx drizzle-kit generate --name <cambio>`.
