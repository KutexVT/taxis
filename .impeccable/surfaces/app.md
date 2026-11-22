# Toda la aplicación

Mode: Operate. Code-led. Alcance: login y todos los paneles de dueño, locutor y taxista.

## Direction contract
THESIS: Una central de taxi que se entiende al primer toque. La tarea principal precede las métricas secundarias.

OWN-WORLD: Blanco, negro y grises de DESIGN.md aportado. Tema claro y oscuro a petición del usuario. Tipografía de sistema legible. Acciones de alto contraste redondeadas, campos grises y superficies planas. Colores semánticos solo para estados, alertas y los pines elegidos por el usuario.

STORY: Entrar, reconocer el panel propio y acceder al viaje, mapa o conversación. Opciones secundarias agrupadas sin eliminarlas.

FIRST VIEWPORT: En celular, cabecera compacta con identidad y avisos, título legible y tarea principal. Barra inferior fija con iconos y texto. En computadora, navegación lateral y espacio amplio de trabajo. Inicio del locutor con acceso a nuevo servicio y mapa; taxista con ubicación y viaje actual. Chat de una sola columna en celular con regreso a contactos.

FORM: Dirección fijada por el usuario: Uber móvil accesible. Sin sorteo de estilos. Uso móvil exterior y oficina: fondo claro de alto contraste. Interacción distintiva: acciones de viaje grandes junto a origen y destino. Transiciones cortas y movimiento reducido respetado.

## Tema y movimiento

Tema inicial según el sistema. El botón del acceso y de todas las cabeceras guarda la elección local y sincroniza otras pestañas. Superficies, campos, diálogos, historial, chat y controles del mapa usan colores semánticos en ambos temas. El mapa base se atenúa sin cambiar colores de pines ni zonas.

Focal moment: abrir una ventana sobre la operación mantiene la relación entre cabecera y contenido con una llegada breve de 200 ms. Continuity: cambio de tema en 180 ms y mensaje nuevo en 180 ms dentro de la conversación. Feedback: pulsación de acciones con escala 0.97 durante 120 ms. Budget: CSS sin dependencias nuevas ni animaciones de desplazamiento continuo. Movimiento reducido elimina desplazamiento y escala y conserva la confirmación visual del estado.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
