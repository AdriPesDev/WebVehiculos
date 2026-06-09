# Nethive Gestión de Vehículos

Aplicación web para la gestión de flotas de vehículos empresariales. Permite registrar salidas y llegadas, controlar viajes en curso, gestionar pasajeros y llevar el historial de uso y mantenimiento de cada vehículo.

## Arquitectura

| Capa | Tecnología | Puerto |
|------|-----------|--------|
| API REST | Node.js + Express + express-session | 3000 |
| Frontend SPA | React 19 + Vite + React Router v7 | 5173 (dev) |
| Persistencia | Ficheros JSON en `data/` | — |

El frontend se comunica con la API a través de `/api/*`. En desarrollo, Vite redirige esas peticiones al servidor Express mediante un proxy. En producción, Express sirve directamente el build de React.

## Requisitos

- Node.js ≥ 18

## Instalación y arranque

### Modo desarrollo (dos terminales)

```bash
# Terminal 1 — API Express
cd webGestionVehiculos
npm install
node server.js
# API disponible en http://localhost:3000
```

```bash
# Terminal 2 — Frontend React
cd webGestionVehiculos/client
npm install
npm run dev
# Abrir http://localhost:5173
```

### Modo producción (build + servidor único)

```bash
# Compilar el frontend
cd webGestionVehiculos/client
npm run build

# Arrancar solo el servidor (sirve la API y el frontend compilado)
cd ..
node server.js
# Abrir http://localhost:3000
```

## Credenciales iniciales

Las credenciales de acceso inicial se generan automáticamente al primera ejecución:

| Rol | Email |
|-----|-------|
| Superadmin | `superadmin@nethive.com` |
| Admin (empresa Nethive) | `admin@nethive.com` |

**La contraseña se mostrará en la consola al iniciar el servidor por primera vez.** Guarda estas credenciales en un lugar seguro.

Para usar contraseñas específicas, configura `SUPERADMIN_PASSWORD` y `ADMIN_PASSWORD` en tu archivo `.env` antes de ejecutar el servidor.

Los empleados se crean desde el panel de administración o se registran y solicitan unirse a una empresa.

## Roles del sistema

| Rol | Descripción |
|-----|------------|
| `superadmin` | Acceso global: puede ver y eliminar todas las empresas |
| `admin` | Gestiona su empresa: vehículos, empleados, solicitudes de membresía y mantenimientos |
| `empleado` | Registra salidas/llegadas de vehículos, ve su historial de viajes como conductor o pasajero |
| `sin_empresa` | Usuario recién registrado sin empresa asignada; puede crear una empresa o solicitar unirse |

## Funcionalidades principales

- **Gestión de flota** — añadir, eliminar y poner en mantenimiento vehículos
- **Viajes** — registrar salida (checkout) con destino y conductor opcional; registrar llegada (checkin) actualizando la ubicación del vehículo al destino
- **Pasajeros** — añadir pasajeros a un viaje en curso: empleados registrados (vinculados a su cuenta) o nombres libres; solo el conductor o un admin pueden gestionar la lista
- **Historial filtrado** — los empleados solo ven los viajes en los que participaron como conductor o pasajero; los admins ven el historial completo
- **Solicitudes de membresía** — flujo de aprobación para que usuarios sin empresa se unan a una existente
- **Reseteo de estado** — botón de admin para restablecer vehículos bloqueados en un estado incorrecto

## Estructura de ficheros relevante

```
webGestionVehiculos/
├── server.js                  # API REST Express (todos los endpoints /api/*)
├── package.json
├── data/
│   ├── users.json
│   ├── companies.json
│   ├── vehicles.json
│   ├── trips.json
│   └── membership_requests.json
├── public/
│   └── css/styles.css         # Estilos globales compartidos
└── client/                    # SPA React (Vite)
    ├── vite.config.js          # Proxy /api → localhost:3000 en dev
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx             # Rutas + AuthProvider + PrivateRoute
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js          # Capa de llamadas fetch a la API
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── Header.jsx
    │   │   ├── Footer.jsx
    │   │   ├── Drawer.jsx      # Panel lateral para añadir vehículos/empleados
    │   │   ├── Badge.jsx       # Indicador de estado de vehículo
    │   │   └── Alert.jsx
    │   └── pages/
    │       ├── Home.jsx
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx           # Enrutador de rol → dashboard específico
    │       ├── DashboardAdmin.jsx
    │       ├── DashboardEmpleado.jsx
    │       ├── DashboardSuperadmin.jsx
    │       ├── DashboardNoCompany.jsx
    │       ├── VehicleDetail.jsx       # Detalle, viaje activo, historial
    │       ├── CompanyCreate.jsx
    │       ├── CompanyList.jsx
    │       └── NotFound.jsx
    └── public/
        └── favicon.svg
```
