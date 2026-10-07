# Logos de instituciones

Las tarjetas de Búsqueda de instituciones usan el CDN de Logo.dev por dominio.
Los logos oficiales incluidos en el repositorio funcionan sin clave. Para las
demás instituciones, sin clave publicable válida, sin dominio o si una imagen
falla, se muestra el SVG genérico existente. No se modifica la respuesta del MEN, la base de datos ni los
códigos de las sedes. No hace falta instalar dependencias.

## Configuración local

1. Regístrate en https://www.logo.dev y elige Community (gratuito).
2. En API keys, copia **Publishable key**, que empieza por `pk_`.
3. Crea `frontend/.env.local` y escribe `VITE_LOGO_DEV_TOKEN=pk_tu_clave_publicable`.
   Este archivo está ignorado por Git. No uses una Secret key (`sk_`).
4. Reinicia Vite (`npm run dev`, o el proceso frontend que ya estés utilizando).
5. Si activas Allowed domains only en Logo.dev, añade `localhost` y, cuando
   corresponda, el dominio donde publiques EduPlan. Las imágenes envían el
   origen mediante `strict-origin-when-cross-origin`.

En producción configura esa misma variable **antes de construir** el frontend;
Vite la incorpora al build. Cambiarla después requiere generar otro build.
El pie público muestra atribución a Logo.dev cuando la integración está activa.

## Compartir con el equipo

Subir los cambios a `develop` incluye las imágenes de `frontend/public/logos/`,
pero no `frontend/.env.local`. La Javeriana usa un escudo oficial local para
Bogotá y Cali y se verá sin configurar claves. El archivo original proviene de
https://www.javeriana.edu.co/recursosdb/813229/876340/escudo.jpg/d50cc116-506a-aa97-a779-97b3d54bbce0?t=1605136261557
y está publicado en la página institucional de emblemas.

Para ver el resto de logos automáticos en desarrollo, cada integrante configura
`VITE_LOGO_DEV_TOKEN` con la misma **clave publicable** del proyecto. No necesita
una cuenta de Logo.dev propia. El uso de todos comparte la cuota de esa cuenta.
La clave `pk_` está diseñada para el navegador y es visible en las URLs de
imágenes; la clave `sk_` no se comparte ni se incorpora al frontend.

En un sitio publicado basta configurar la clave al construir el frontend: sus
visitantes ven los logos sin configurar nada. Si activas restricciones de origen
en Logo.dev, incluye localhost y el dominio de ese sitio. Para que todo el
catálogo funcione sin ningún proveedor, sería necesario incorporar más logos
oficiales locales; por ahora solo está incluido el de Javeriana.

## Identidades y excepciones

`frontend/src/data/institution-logos.js` conserva asociaciones explícitas por
código MEN para compartir una URL entre sedes de Javeriana, Nacional, Antioquia,
Valle, Libre, SENA, UPB y Santo Tomás. La asociación de una marca no significa
que la imagen entregada por el proveedor haya sido revisada visualmente.
Las demás instituciones usan el hostname válido de `website`. Logo.dev resuelve
el dominio registrable: no se recortan dominios como `edu.co` por segmentos.

Prioridad: deshabilitación explícita → imagen de la sede → imagen de la marca →
dominio configurado de la sede/marca o sitio MEN → icono genérico.
Las escuelas 3114 y 3901 están deshabilitadas para evitar sustituir sus emblemas
por la marca genérica de la Armada que comparte su dominio.

Para un logo manual:

1. Obtén y revisa la imagen en la fuente institucional oficial.
2. Guarda el archivo, preferiblemente WebP/PNG transparente, en
   `frontend/public/logos/` (crea la carpeta al incorporar el primer archivo).
3. Añade `logoUrl: '/logos/archivo.webp'` a la marca para todas sus sedes, o a
   `institutionLogoOverrides['CODIGO']` para una sede. Retira `disabled: true`
   cuando el emblema esté verificado. Registra `sourceUrl` y `reviewedAt` junto
   a la entrada para conservar evidencia y facilitar revisiones posteriores.
4. Para corregir solo un dominio usa `{ domain: 'dominio-oficial.edu.co' }`.
   Para bloquear una imagen incorrecta usa `{ disabled: true }`.

Los parámetros `fallback=404` evitan presentar monogramas como logos oficiales
y `redirect=404` impide seguir dominios antiguos hacia otra marca. Esto puede
requerir corregir dominios que redirigen legítimamente. `onError` restaura el
icono sin un bucle de solicitudes. La imagen se carga de forma diferida, mantiene
un espacio reservado y se ajusta sin recortar. Toda la tarjeta tiene fondo blanco.

## Revisión y límites

Revisa visualmente las imágenes contra la fuente oficial: HTTP 200 no garantiza
que el logo sea correcto o actual. La integración no certifica cobertura total.
El catálogo consultado durante el análisis tenía 20 sitios incompletos o
incorrectos; corrige sus dominios o incorpora logos manuales tras verificarlos.

Community incluye 500.000 solicitudes mensuales al CDN y tiene un límite estricto.
Los navegadores reutilizan imágenes idénticas desde su caché. Las claves
publicables no gastan créditos de la API. No descargues el CDN para almacenar
copias: el almacenamiento propio debe usar la API de archivos y su clave
secreta en el servidor, una ampliación todavía no implementada.

Documentación oficial:

- https://www.logo.dev/docs/logo-images/introduction
- https://www.logo.dev/docs/platform/api-keys
- https://www.logo.dev/docs/platform/attribution
- https://www.logo.dev/pricing

Pruebas: `npm run test --prefix frontend`, `npm run lint --prefix frontend` y
`npm run build --prefix frontend`. La prueba de navegador
`frontend/tests/institution-logos-smoke.mjs` usa imágenes simuladas para comprobar
carga, errores, cambio de filtros, sedes y vista móvil sin consumir cuota ni
certificar logos reales. Requiere Playwright ya disponible, como los demás smoke
tests del proyecto. Ejecútala contra Vite con
`VITE_LOGO_DEV_TOKEN=pk_fixture_only`; esta clave ficticia se usa únicamente
con las respuestas de red simuladas. `EDUPLAN_TEST_URL` permite usar un servidor
de pruebas separado (por ejemplo, en el puerto 3006).
