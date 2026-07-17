# Nethive Gestión de Vehículos

Aplicación web **interna de Nethive** para la gestión de su flota: registrar salidas y llegadas, controlar viajes en curso, gestionar pasajeros y llevar el historial de uso y mantenimiento de cada vehículo. Incluye un **modo kiosko** para tablets desde las que se registran los viajes.

## Arquitectura

| Capa | Tecnología | Repositorio |
|------|-----------|-------------|
| Frontend SPA | React 19 + Vite + React Router v7 | este repo (`client/`) |
| API REST | Node.js + Express + PostgreSQL | `ApiGestionVehiculos` (repo aparte) |

El frontend se compila a estáticos (`client/dist`) y se sirve con un servidor web (nginx). Se comunica con la API en `/api/*` según `VITE_API_URL`. La API es la fuente de verdad de datos, roles y empresa; el frontend no tiene backend propio.

> Es una app **mono-empresa**: sirve exclusivamente a Nethive (`id_empresa = 8` en la BD). No hay registro público, ni gestión de empresas, ni rol superadmin.

## Requisitos

- Node.js ≥ 18

## Arranque en desarrollo

```bash
cd client
npm install
npm run dev
# Abrir http://localhost:5173
```

`VITE_API_URL` (en `client/.env`) apunta a la API. La API (`ApiGestionVehiculos`) debe estar levantada aparte.

## Build de producción

```bash
cd client
npm run build
# Genera client/dist, servido por nginx
```

## Acceso

- **SSO del portal Nethive** — los usuarios del portal con perfil en la app entran directamente.
- **Login local** (`/login`) — email + contraseña contra la tabla `usuario`.
- **Kiosko** (`/kiosko`) — auto-login para tablets con el usuario `kiosko@nethive.es`; no requiere portal.

Los usuarios los crea un admin desde el panel, o llegan por el SSO del portal (deben existir ya en la BD).

## Roles

| Rol | Descripción |
|-----|------------|
| `admin` | Gestiona la flota: vehículos, empleados, encuestas y mantenimientos |
| `empleado` | Registra salidas/llegadas, ve su historial como conductor o pasajero |

## Funcionalidades principales

- **Gestión de flota** — añadir, eliminar y poner en mantenimiento vehículos
- **Viajes** — registrar salida (checkout) con conductor y pasajeros; registrar llegada (checkin) actualizando la ubicación del vehículo
- **Pasajeros** — añadir empleados registrados a un viaje en curso; solo el conductor o un admin gestionan la lista
- **Historial filtrado** — los empleados solo ven sus viajes; los admins ven el historial completo
- **Encuestas** — preguntas configurables por vehículo (o globales) que se responden al finalizar un viaje

## Estructura relevante

```
WebVehiculos/
└── client/                    # SPA React (Vite)
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx             # Rutas + AuthProvider + PrivateRoute
    │   ├── context/AuthContext.jsx
    │   ├── services/api.js     # Capa de llamadas fetch a la API
    │   ├── components/         # Layout, Header, Drawer, Badge, SurveyBuilderModal, ...
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Kiosko.jsx
    │       ├── Dashboard.jsx           # Enruta por rol → dashboard específico
    │       ├── DashboardAdmin.jsx
    │       ├── DashboardEmpleado.jsx
    │       ├── VehicleDetail.jsx
    │       └── NotFound.jsx
    └── dist/                   # Build de producción (servido por nginx)
```
