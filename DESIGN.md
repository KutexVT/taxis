---
name: Central de Taxi
description: Una central de taxi accesible con temas claro y oscuro y movimiento breve
colors:
  brand: "rgb(var(--ink))"
  brand-soft: "rgb(var(--brand-soft))"
  surface: "rgb(var(--surface))"
  surface-raised: "rgb(var(--surface-raised))"
  surface-overlay: "rgb(var(--surface-overlay))"
  surface-border: "rgb(var(--surface-border))"
  body: "rgb(var(--body))"
  muted: "rgb(var(--muted))"
  placeholder: "rgb(var(--muted))"
  neutral-hover: "rgb(var(--surface-hover))"
  accent-green: "#166534"
  accent-blue: "#1d4ed8"
  accent-red: "#b91c1c"
  accent-amber: "#92400e"
  status-green: "rgb(var(--status-green))"
  status-blue: "rgb(var(--status-blue))"
  status-red: "rgb(var(--status-red))"
  status-amber: "rgb(var(--status-amber))"
  danger-surface: "rgb(var(--status-red) / 0.1)"
  danger-hover: "rgb(var(--status-red) / 0.2)"
  danger-border: "rgb(var(--status-red) / 0.3)"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "2.25rem"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  button:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.5rem"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
rounded:
  xl: "0.75rem"
  2xl: "1rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-soft}"
  button-secondary:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.brand}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.25rem"
  button-secondary-hover:
    backgroundColor: "{colors.neutral-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.body}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0.5rem 1rem"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.status-red}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0.5rem 1rem"
  field:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.brand}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  nav-link:
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1rem"
  badge:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  stat-card:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.body}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.4}"
  sos:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.status-red}"
    rounded: "{rounded.full}"
    padding: "0 1rem"
---

# Design System: Central de Taxi

## Overview

**Creative North Star: "Una central que se entiende al primer toque"**

La dirección aprobada toma la sencillez de Uber móvil: acciones de alto contraste, superficies planas y grises para campos y agrupaciones. El tema claro usa acciones negras sobre blanco; el oscuro invierte el contraste con acciones claras sobre superficies oscuras. La interfaz conserva su identidad de Central de Taxi y sus tareas de despacho, ubicación y comunicación. Prioriza lectura y uso táctil por personas mayores.

La fuente de verdad es la implementación de `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts` y los componentes compartidos. La referencia aportada en `/home/kutex/DESIGN.md` y la [presentación oficial de Uber móvil](https://www.uber.com/gb/en/u/redesigned-uber-app/) orientan el carácter, pero no sustituyen los valores implementados. No se importaron las tipografías propietarias ni la composición de marketing de Uber.

**Key Characteristics:**

- Acciones principales de alto contraste y redondeadas con texto visible
- Superficies claras u oscuras y planas con agrupación por tono y espacio
- Controles amplios y etiquetas legibles en celular y computadora
- Estados semánticos con palabras además del color
- Movimiento breve que respeta la preferencia de movimiento reducido

## Colors

### Primary

`brand` sigue la tinta de botones principales, títulos y foco: negra en claro y casi blanca en oscuro. El texto del botón principal usa `surface` para conservar el contraste en ambos temas. `brand-soft` suaviza el estado hover sin introducir otro acento de marca.

### Neutral

`surface` es el lienzo y `surface-raised` identifica tarjetas, cabeceras, diálogos y navegación inferior. `surface-overlay` distingue campos, métricas y navegación seleccionada. `surface-border` separa regiones. `body` mantiene el texto principal y `muted` sirve a información secundaria y placeholders. `neutral-hover` indica interacción sobre superficies grises. Los tokens adaptables usan las variables CSS reales; sus valores por tema están en `extensions.themes` del sidecar.

Los estados verde, azul, rojo y ámbar expresan disponibilidad, progreso, peligro y espera. `status-*` adapta el texto semántico al tema. `accent-*` conserva los colores sólidos fijos usados en fondos de acciones y en fondos de insignia con alfa; no debe sustituir al texto adaptable. Peligro y SOS usan `status-red` con alfa para fondo y borde. Las insignias de viaje conservan fondos `accent-*` al 15 % y bordes al 30 %, mientras las alertas abiertas usan `status-*` al 10 % y 30 %. Los pines y zonas del mapa conservan los colores elegidos por el usuario: no son acentos de marca.

El tema inicial sigue al sistema salvo que exista una elección manual guardada como `taxi-theme`. El botón de tema guarda claro u oscuro; los cambios se sincronizan entre pestañas. Los cambios del sistema se aplican mientras no haya una elección manual. El tema se aplica antes del contenido y actualiza el color del navegador. En oscuro el mapa base se atenúa sin recolorear pines ni zonas.

**The Estado Legible Rule.** El color de estado siempre acompaña una palabra o una forma reconocible; nunca reemplaza la etiqueta.

## Typography

La pila de sistema implementada sirve al texto operativo, los títulos y los controles. No requiere descarga de fuentes. El frontmatter conserva los roles recurrentes: encabezado de página, título de diálogo, cuerpo, botón y etiqueta. Las métricas comparten el tamaño de encabezado y usan cifras tabulares.

El texto pequeño compartido se elevó a 14 px y el tamaño pequeño de Tailwind a 16 px. Los controles mantienen texto de 16 px. El titular grande de acceso es una excepción local de presentación, no un nuevo rol para paneles operativos. No se generaliza como tipografía de marca.

## Layout

La estructura cambia a navegación lateral en 1024 px. La barra lateral mide 240 px y el área de trabajo se limita a 1280 px. El contenido usa márgenes internos de 16 px en celular y 32 px desde 640 px. La cabecera tiene una altura mínima de 76 px. La navegación inferior fija conserva iconos y texto con altura mínima de 72 px más el área segura del dispositivo.

El contenido reserva 112 px inferiores para esa navegación y vuelve a 40 px en escritorio. Las tablas de historial se convierten en filas apiladas con etiquetas bajo 640 px. El chat usa una columna en celular y ofrece regreso a contactos. Formularios, viajes y mapas preservan las operaciones por rol; el menú Más o Cuenta agrupa opciones secundarias.

**The Acción Alcanzable Rule.** Los controles compartidos conservan una altura mínima de 48 px y las opciones de navegación mantienen texto visible.

## Elevation & Depth

La profundidad procede principalmente de superficies del tema, bordes finos y espacio. En oscuro las superficies elevadas son un tono más claras que el lienzo. Las tarjetas ordinarias permanecen planas. El único sombreado personalizado recurrente, `card`, se reserva para diálogos y controles flotantes o resultados sobre el mapa. Su valor y los detalles de movimiento están en el sidecar.

Los diálogos nativos usan un fondo negro al 50 % y mantienen foco, cierre con Escape y retorno del foco. Al abrir llegan en 200 ms desde 12 px por debajo con escala 0.98 y opacidad 0.5; el fondo entra en 160 ms. Las superficies cambian de color en 180 ms. Solo el último mensaje de una conversación usa una entrada de 180 ms desde 5 px por debajo y opacidad 0.6. La preferencia de movimiento reducido limita animaciones y transiciones a 0.01 ms con una iteración y elimina la escala al pulsar.

## Shapes

Botones, navegación lateral e insignias comparten la silueta de píldora. Campos usan `rounded.xl` y tarjetas usan `rounded.2xl`. La navegación inferior tiene extremos rectos para ocupar todo el ancho. Bordes de un píxel separan tarjetas y regiones sin añadir volumen innecesario. Los iconos compartidos son SVG de contorno con trazo redondeado y tamaño base de 24 px.

## Components

### Buttons

El botón principal usa tinta del tema con texto del lienzo. El secundario usa la superficie de agrupación con texto de tinta. Ambos comparten altura mínima de 48 px, tipografía de botón y transición de color de 180 ms; el estado deshabilitado baja la opacidad al 40 %. El botón Ghost conserva fondo transparente y borde fino. Su variante destructiva usa texto y borde rojos adaptables con un fondo rojo al 10 % al pasar el puntero.

El foco global usa tinta del tema con un contorno de 2 px separado 4 px. Los botones principales y secundarios habilitados se comprimen a escala 0.97 al pulsar con transición de 120 ms. Con movimiento reducido conservan su tamaño.

### Chips

Las insignias son píldoras compactas con borde, texto de etiqueta y una palabra de estado en español. Los fondos semánticos transparentes del componente `Badge` son estados, no una ampliación de la identidad de marca. Una insignia informativa no simula ser un botón.

### Cards / Containers

La tarjeta común usa superficie elevada del tema, borde de separación y esquinas de tarjeta. Las métricas usan la superficie de agrupación y relleno de 16 px que pasa a 20 px desde 640 px. Solo las métricas enlazadas cambian de fondo al pasar el puntero y muestran una flecha. Los valores sintéticos del sidecar son ejemplos visuales.

### Inputs / Fields

Campos y selectores comparten superficie de agrupación del tema, borde transparente y etiqueta visible encima. Al enfocar usan borde y anillo de tinta del tema. El marcador de requerido acompaña la etiqueta. Los errores usan texto visible en una superficie semántica; un placeholder no reemplaza la etiqueta.

### Navigation

La navegación lateral usa una fila redondeada con icono y texto. La página activa se identifica mediante `aria-current`, superficie de agrupación y tinta del tema. En celular se convierte en barra inferior con iconos encima de sus etiquetas y trazo más grueso en el icono activo. Las opciones secundarias siguen disponibles dentro de Más o Cuenta. Existe un enlace para saltar al contenido.

### SOS and icon assets

SOS es una acción roja diferenciada con texto visible que permite avisar a la central y abrir el teléfono con 911. El ejemplo del sidecar es un botón visual inerte para evitar iniciar una llamada desde el catálogo.

`apps/web/public/icon.svg` es un vector elaborado para esta aplicación: una T blanca sobre un cuadrado negro de esquinas redondeadas. Los iconos `icon-192.png` y `icon-512.png` se rasterizaron desde ese SVG mediante Sharp y conservan procedencia embebida. La revisión de entrega informó cero imágenes sin procedencia. No hay imágenes generadas por IA en este rediseño. Los iconos operativos se definen en `components/ui/Icon.tsx`.

## Do's and Don'ts

### Do:

- Do conservar acciones de alto contraste y grises del tema para agrupación visual
- Do mantener texto visible junto a iconos de navegación y estados
- Do respetar foco de teclado, zoom y movimiento reducido
- Do preservar todas las operaciones por rol al adaptar la distribución

### Don't:

- Don't añadir un acento de marca que compita con los colores de estado o los pines
- Don't reemplazar etiquetas por placeholders o iconos sin nombre accesible
- Don't aplicar sombras a todas las tarjetas
- Don't importar tipografías, ilustraciones o reglas de marketing que la aplicación no utiliza
