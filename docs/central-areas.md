# Zonas de central

Una empresa puede tener varias zonas. El dueño dibuja un polígono de 3 a 100 puntos y elige nombre y color. Solo el superadministrador puede crear zonas o modificarlas. Cada locutor y taxista consulta únicamente las de su empresa.

`GET /api/central-areas` devuelve `{ asOf, areas, taxis }`. Los taxis solo incluyen número, nombre, estado, posición vigente y las zonas que ocupan. `POST /api/central-areas` recibe `{ centralId, name, color, polygon: [{ lat, lng }] }`. `PATCH /api/central-areas/:id` permite cambiar nombre, color y contorno. `DELETE /api/central-areas/:id` elimina la zona. Los cambios quedan registrados en auditoría.

La presencia se calcula en el servidor. Los bordes cuentan como interior. Un taxi puede estar en varias zonas superpuestas. Estar ocupado no lo excluye. Detener el GPS o cerrar la última conexión del taxista lo retira. Una posición con 60 segundos de antigüedad caduca incluso si sigue abierto el socket. Los taxistas nunca reciben el flujo de GPS completo de la flota.

El GPS pertenece al layout del taxista y pide una posición nueva cada 15 segundos. La preferencia se conserva por usuario dentro de la pestaña. Los navegadores pueden suspender la geolocalización en segundo plano; en ese caso se retira la presencia al caducar y se vuelve a pedir ubicación al regresar a la app.

## Verificación local

Utilizar una base desechable. No apuntar las pruebas a datos reales.

```sh
npm run prisma:generate
npm run build:shared
DATABASE_URL="$CENTRAL_AREA_TEST_DATABASE_URL" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npx tsx apps/api/src/centralAreas/areas.test.ts
npx tsx apps/api/src/centralAreas/integration.test.ts
npm run build
git diff --check
```

Para la prueba de navegador iniciar `integration.test.ts --serve` con `CENTRAL_AREA_TEST_DATABASE_URL` definido. Levanta una API de prueba en `127.0.0.1:4109` con usuarios `area-owner`, `area-dispatcher` y `area-driver` y contraseña `AreaTest123!`. Terminar el proceso elimina sus usuarios y empresas de prueba.

Desde `apps/web` iniciar Next en el puerto 3109 con `NEXT_PUBLIC_API_URL=http://127.0.0.1:4109` y `NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4109`. Ejecutar `node apps/web/tests/central-areas.mjs` desde la raíz con Playwright disponible. `PLAYWRIGHT_MODULE` acepta la ruta a una instalación externa y `CHROMIUM_PATH` permite elegir el ejecutable. No se añaden dependencias al producto.

Aplicar la migración `20261019000000_central_areas` antes de iniciar esta versión de la API. No modifica centrales ni pines existentes. Las posiciones vuelven a contarse cuando cada taxista envía su siguiente GPS.

## Direction contract

- THESIS: ampliar el mapa operativo con zonas y presencia verificable sin cambiar el despacho.
- OWN-WORLD: conservar las superficies grafito y los controles ámbar existentes. Reutilizar los ocho colores de pines para el contorno y su relleno transparente.
- STORY: el dueño dibuja y guarda. Locutores y taxistas reconocen el lugar por su etiqueta y consultan los taxis presentes.
- FIRST VIEWPORT: mapa principal con buscador superior. Acción de creación abajo a la derecha y zonas con conteos en la lista lateral. En celular la lista queda debajo y el editor es desplazable.
- FORM: extensión del mapa actual. Dibujo con puntos y formulario separados para dejar espacio para tocar el mapa. Sin nueva identidad visual.
- FINISH: comprobar escritorio y celular con capturas y una revisión independiente. Documentar las interfaces y las limitaciones del GPS sin alterar el diseño global.
