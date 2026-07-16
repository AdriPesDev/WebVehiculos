---
name: WebVehiculos
description: Herramienta de flota Nethive para registrar salidas y llegadas de viaje, con kiosko de campo y dashboards de administración.
colors:
  accent: "#009FE3"
  accent-deep: "#0077AA"
  accent-soft: "#E6F5FC"
  ink: "#162333"
  muted: "#64748B"
  paper: "#F7F8F9"
  surface: "#FFFFFF"
  surface-2: "#F8FAFC"
  comb: "#162333"
  comb-2: "#1F2E41"
  line: "#DCE2E8"
  ok: "#2E9E6B"
  warn: "#D89A12"
  bad: "#D85B4A"
  info: "#3B7DD8"
typography:
  display:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 3vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  stat:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  sm: "12px"
  md: "14px"
  lg: "19px"
  xl: "24px"
  full: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "#FFFFFF"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: "11px 22px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "11px 22px"
  icon-btn:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: "38px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  kiosk-action:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "16px 32px"
    height: "56px"
---

# Design System: WebVehiculos

## 1. Overview

**Creative North Star: "El Parte de Ruta" (The Dispatch Board)**

WebVehiculos es la herramienta de flota de Nethive: un empleado de campo registra la salida o la llegada de un viaje en pocos toques, muchas veces desde un kiosko compartido o su móvil, con prisa y a veces con mala luz. El sistema se comporta como un parte de ruta físico clavado en la pared del garaje — una acción evidente a la vez, estado legible a un brazo de distancia, cero adorno que estorbe. Toda la personalidad la carga un único azul Nethive (#009FE3) que aparece solo donde hay que actuar; el resto es papel frío y tinta oscura.

Hereda la disciplina del sistema hermano **Nethive Portal** ("The Honeycomb Workspace"): la misma paleta corporativa, la regla de un solo accent, y superficies planas que solo se elevan al interactuar. Pero la tensa hacia el turno de campo: dianas de toque grandes, jerarquía brutal (el botón que importa domina la pantalla), y un lado de administración que puede permitirse densidad honesta sin volverse una sopa de datos.

Rechaza explícitamente cuatro cosas, heredadas de PRODUCT.md: el look **enterprise/ERP anticuado** (tablas grises densas, tipografía diminuta, intranet de 2005); la estética **consumer/juguetona** (UI de burbujas, badges gamificados, emoji por decoración); el **SaaS de IA genérico** (degradados morados, glassmorphism decorativo, la plantilla del dato-héroe, rejillas de tarjetas idénticas); y el **dashboard sobrecargado** (todo a la vez, sin jerarquía).

**Key Characteristics:**
- Un solo azul Nethive, raro y con propósito — nunca como fondo ni decoración.
- Plano por defecto; la sombra es una respuesta a la interacción (hover / elevación), no un adorno de reposo.
- Kiosko primero: dianas de toque ≥56px, una acción primaria inconfundible por pantalla.
- Rojo y verde reservados a su significado — acción de entrada/salida y estado — nunca como color de marca.
- Tipografía Nethive Portal: Space Grotesk (títulos), IBM Plex Sans (cuerpo), IBM Plex Mono (datos).
- Identidad propia **Nethive Fleet**: marca de furgoneta dentro de un hexágono (panal Nethive + flota), en header y favicon.
- Iconografía **SVG** stroke (nunca emojis) coherente en toda la app.

## 2. Colors

Papel frío y tinta navy anclados por un único azul Nethive; el chrome (headers) va en degradado azul profundo; los semánticos hablan solo cuando significan algo.

### Primary
- **Azul Nethive** (#009FE3): el único accent. Acción primaria (botón de registrar, "Confirmar salida"), foco de inputs, estado activo de navegación, bordes y badges de selección. Nunca como fondo de página ni relleno decorativo.
- **Azul Profundo** (#0077AA): hover/active del accent y el degradado de los botones primarios (#0077AA → #005F88). También el texto-sobre-tinte cuando hace falta contraste sobre superficies claras.
- **Azul Suave** (#E6F5FC): tinte de fondo tras iconos/insignias accent en tarjetas.

### Neutral
- **Tinta** (#162333): texto primario y color "primary" del sistema. Alto contraste sobre papel para legibilidad a un brazo.
- **Apagado** (#64748B): texto secundario, placeholders, etiquetas de tabla y encabezados uppercase. Contraste AA sobre papel/superficie.
- **Papel** (#F7F8F9): fondo de página.
- **Superficie** (#FFFFFF): tarjetas, formularios, filas de tabla.
- **Superficie 2** (#F8FAFC): capa neutra más fría para `thead` de tablas y hover de fila.
- **Comb / Navy** (#162333, hover #1F2E41): navy corporativo, usado como tinta (`ink`) y disponible para chrome oscuro. *Nota: los headers no lo usan (ver Navigation).*
- **Chrome azul** (`linear-gradient(90deg, #0077AA 0%, #005F88 100%)`): el fondo de **ambos headers** (topbar del panel y header del Kiosko). Sobre él, el logo va en variante clara (hexágono blanco + furgoneta azul) y el texto en blanco.
- **Línea** (#DCE2E8): bordes y divisores de 1px.
- *El fondo va limpio (paper), sin lavados azules; el azul aparece solo como accent.*

### Semantic
- **OK** (#2E9E6B), **Warn** (#D89A12), **Bad** (#D85B4A), **Info** (#3B7DD8): estado de viajes, validación de formularios y feedback (alertas). Usados solo por su significado. Tres de ellos tienen un **segundo trabajo semántico** que se mantiene siempre: **verde** y **rojo** distinguen acciones y respuestas de campo (salida/llegada, Sí/No), y el **ámbar** marca aviso y mantenimiento (viaje en curso, vehículo en mantenimiento, alerta de revisión). Ahí su presencia es intencional, no decorativa.

### Named Rules
**The One Accent Rule.** El azul Nethive es el único color que dice "actúa aquí". Si más de un elemento por vista usa el relleno accent, la jerarquía está rota — degrada el sobrante a neutro. La rareza del accent es el punto.

**The Semantic Status Rule.** Verde, rojo y ámbar nunca son color de marca. Aparecen solo por su significado: estado (ok/warn/bad), acción de campo (salida/llegada, Sí/No) y aviso/mantenimiento (ámbar). Fuera de esos trabajos, están prohibidos.

## 3. Typography

Tipografía de Nethive Portal: un display geométrico + un cuerpo humanista + un mono para datos.

**Display Font:** Space Grotesk (fallback `IBM Plex Sans, system-ui, sans-serif`) — titulares, títulos de sección, wordmark y números-stat.
**Body Font:** IBM Plex Sans (fallback `system-ui, sans-serif`) — cuerpo, botones, formularios, tablas. Es el `--font` por defecto (lo usa también el Kiosko).
**Label/Mono Font:** IBM Plex Mono — micro-etiquetas MAYÚSCULA y datos tabulares (encabezados de tabla, etiquetas de stat card).

**Character:** El display geométrico da titulares con carácter sin gritar; el cuerpo humanista se lee cómodo en tarea; el mono ancla lo técnico/tabular. La personalidad la reparten paleta, tipografía e iconografía — no la decoración.

### Hierarchy
- **Display** (Space Grotesk 700, `clamp(2.2rem, 3vw, 3.5rem)`, 1.15, -0.02em): títulos de héroe. *Único uso de tamaño fluido; el resto usa escala rem fija.*
- **Stat** (Space Grotesk 700, 2.5rem, 1): número grande de las stat cards.
- **Title** (Space Grotesk 700, 1.1rem): títulos de sección y de tarjeta.
- **Body** (IBM Plex Sans 400, 1rem, 1.6): copia, formularios, tablas. Prosa larga a 65–75ch.
- **Label** (IBM Plex Mono 600, 0.72rem, 0.06em, MAYÚSCULAS): encabezados de tabla y etiquetas de stat. Solo para marcar estructura, nunca énfasis.

### Named Rules
**The Structural Label Rule.** El estilo mono-mayúscula-tracked marca estructura (encabezado de tabla, categoría, rol). Si no marca un límite, no lo lleva.

## 4. Elevation

Sistema mayormente plano: las superficies en reposo se distinguen por un borde de 1px (`line`) y el tinte de fondo, no por sombra. La sombra aparece como respuesta a la interacción — las tarjetas (`feature-card`, `vehicle-card`, `admin-card`) suben con `translateY(-4px a -5px)` y ganan una sombra ambiental más un halo accent tenue al hacer hover, que es la señal de "esto es pulsable y se levanta". Los overlays reales (drawer, modales) sí flotan con sombra fuerte porque están delante de todo.

### Shadow Vocabulary
- **Ambient Soft** (`0 4px 24px rgba(15,23,42,0.05)`): reposo de tarjetas de contenido; elevación ambiental apenas perceptible.
- **Hover Lift** (`0 12px 24px rgba(15,23,42,0.10)`): estado hover de tarjetas, junto al `translateY`.
- **Accent Glow** (`0 8px 20px rgba(0,159,227,0.30–0.35)`): halo azul bajo botones primarios y outline al hover — la única sombra teñida de color, reservada al accent.
- **Overlay** (`0 20px 60px rgba(15,23,42,0.20)` / drawer `-8px 0 40px rgba(15,23,42,0.15)`): modales y drawer que se sitúan delante de la página.

### Named Rules
**The Flat-By-Default Rule.** Nada lleva sombra por estar en la página. La sombra se gana flotando (un overlay) o respondiendo a la interacción (hover-lift). Todo lo demás lee su jerarquía del borde y el tinte de fondo.

## 5. Components

### Buttons
- **Shape:** **píldora** (`999px`) — todos los botones de texto, `nav-btn` y badges/chips.
- **Primary:** relleno **sólido** `accent` (#009FE3), texto blanco, peso 600, padding `0.7rem 1.35rem` (~40px de alto). Hover: pasa a `accent-deep` (#0077AA) + Accent Glow suave. `:active` baja a `scale(0.97)`. **Uno por vista** (One Accent Rule).
- **Outline:** transparente, texto y borde `accent` (1.5px). Hover: se rellena de accent con texto blanco.
- **Ghost (neutro):** transparente, texto `ink`, borde 1.5px `line`. Hover: tinte `paper` + borde `muted`. Secundario por defecto sobre superficie clara.
- **Danger / Warning:** outline `bad` / `warn` (1.5px) que se rellena al hover. Eliminar y mantenimiento/aviso (Semantic Status Rule).
- **Secondary (sobre color):** transparente con borde blanco 1.5px — solo para superficies de color (topbar/kiosko header).

### Icon buttons (acciones de fila)
- **`.icon-btn`**: círculo de 38px (`999px`), borde 1.5px, icono SVG de 18px que hereda `currentColor`. Solo icono, siempre con `title` + `aria-label`.
- **Variantes semánticas:** `icon-btn-accent` (ver detalles = ojo, editar = lápiz, ambos azules), `icon-btn-warning` (mantenimiento = llave, ámbar), `icon-btn-danger` (eliminar = papelera, rojo). Sustituyen a los botones de texto en las celdas de acción de las tablas.

### Cards / Containers
- **Corner Style:** `lg` (19px, `1.2rem`) para tarjetas de contenido; `xl` (24px, `1.5rem`) para dashboard, tabla-sección y héroe.
- **Background:** blanco (`surface`); las tarjetas base de administración usan `surface-2`.
- **Shadow Strategy:** Ambient Soft en reposo → Hover Lift + `translateY(-4/-5px)` al hover (ver Elevation).
- **Border:** 1px `line`.
- **Internal Padding:** `24px` (`1.5rem`) — `2rem` en secciones grandes (dashboard, héroe).
- **Nunca** anides tarjeta dentro de tarjeta.

### Inputs / Fields
- **Style:** fondo `surface`, borde 1px `line`, radio `md` (14px, `0.9rem`), padding `0.9rem 1rem`.
- **Focus:** el borde pasa a `accent` + anillo de 3px `rgba(0,159,227,0.15)`; sin outline del navegador.
- **Password:** toggle de visibilidad inline a la derecha, en color `muted`, que pasa a `accent` al hover.

### Tables
- **Head:** fondo `surface-2`, `th` en Label uppercase `muted`, borde inferior 1px `line`.
- **Rows:** celdas centradas, borde inferior 1px `line`; fila hover tiñe a `rgba(0,159,227,0.04)`.
- **Contenedor:** `table-section` con `overflow-x:auto` para scroll horizontal en móvil.

### Navigation (Topbar)
- Barra superior sticky con degradado azul (`#0077AA → #005F88`), texto blanco, sin blur. Lleva el logo **Nethive Fleet** en variante clara (hexágono blanco + furgoneta azul, "nethive" blanco + "fleet" cian claro #7FD1F3).
- Enlaces con subrayado animado (`scaleX`) al hover.
- **El header del Kiosko usa el mismo degradado** y el mismo logo (en el paso HOME sustituye al título); en los pasos del flujo muestra el título del paso y el botón "Cancelar".

### Kiosk (Signature)
- El flujo salida/llegada es la columna vertebral del producto. Botones de acción grandes: `min-height` 56–80px, radio `sm` (12px, `0.75rem`), tipografía 1.1–1.2rem, `min-width` 160–200px.
- Tarjetas de selección (vehículo, conductor, pasajero) en rejilla `minmax(200px, 1fr)`; seleccionada = relleno del color de acción con texto blanco y borde a juego.
- El azul (`#009FE3`) marca lo navegable/seleccionable; el verde/rojo marca las acciones de entrada/salida y las respuestas Sí/No.

## 6. Do's and Don'ts

### Do:
- **Do** reservar el azul Nethive (#009FE3) para la única acción primaria o el estado activo/seleccionado por vista (The One Accent Rule).
- **Do** mantener toda superficie plana en reposo; introduce sombra solo para overlays flotantes o feedback de hover-lift (The Flat-By-Default Rule).
- **Do** usar verde, rojo y ámbar solo por su significado — estado (ok/bad), acción de campo (salida/llegada, Sí/No) o aviso/mantenimiento (ámbar) — nunca como color de marca (The Semantic Status Rule).
- **Do** dar a las acciones de kiosko dianas de toque ≥56px y una acción primaria inconfundible por pantalla.
- **Do** reservar el estilo mayúscula-tracked para marcar estructura (encabezado de tabla, rol), no como énfasis.
- **Do** honrar `prefers-reduced-motion` y anillos de foco visibles en cada elemento interactivo (WCAG 2.1 AA); mantener el cuerpo/placeholder en ≥4.5:1 sobre su fondo.

### Don't:
- **Don't** construir el look **enterprise/ERP anticuado**: tablas grises densas, tipografía diminuta, intranet de 2005.
- **Don't** caer en lo **consumer/juguetón**: UI de burbujas redondeadas, badges gamificados, emoji por decoración.
- **Don't** usar el **SaaS de IA genérico**: degradados morados, glassmorphism decorativo, la plantilla del dato-héroe (número gigante + label + stats), ni rejillas de tarjetas idénticas repetidas.
- **Don't** sobrecargar el dashboard: todo a la vez, sin jerarquía, sopa de gráficos.
- **Don't** usar texto con degradado (`background-clip:text`) — emphasis por peso o tamaño, color sólido. *(El `.hero-title` actual lo usa; es deuda a saldar.)*
- **Don't** usar `border-left` >1px como franja de color decorativa en tarjetas o alertas — usa borde completo o tinte de fondo. *(Las `.alert-*` actuales usan franja lateral; es deuda a saldar.)*
- **Don't** aplicar `backdrop-filter: blur` decorativo. *(La topbar actual lo hace; mantener solo si aporta, no por defecto.)*
