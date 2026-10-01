# Nombres académicos oficiales

El índice `data/snies-program-names.json` contiene código SNIES, código de institución,
`NOMBRE_DEL_PROGRAMA` y cuatro campos de contraste: título, nivel, modalidad y ciudad,
extraídos de **Descargar programas**
en https://hecaa.mineducacion.gov.co/consultaspublicas/programas.
Incluye fecha de importación, URL, campo y SHA-256 del Excel original.
No contiene URLs de carreras ni datos de usuarios.

Actualización (sin dependencias Python adicionales):

1. Descargar el Excel completo de la consulta pública SNIES, sin filtros.
2. Ejecutar desde `data-integration`:
   `python tools/import-snies-names.py ruta/al/archivo.xlsx --date YYYY-MM-DD`.
3. Revisar el cambio de índice y ejecutar `npm test` y `npm run build`.
4. Reiniciar el servicio para cargar el nuevo índice.

El importador valida las columnas, rechaza exportaciones pequeñas y omite nombres
con caracteres de sustitución. El campo `codigoprograma` de Socrata también está
mal mapeado: por ejemplo, varias carreras de Bogotá llevan el código **11**, que
no identifica sus programas SNIES. Por eso **no se usa para asignar nombres**.

El servicio exige coincidencia de **código exacto de institución, título literal,
nivel académico y modalidad** entre los dos catálogos oficiales. Se normalizan
únicamente mayúsculas, acentos y espacios; se conservan las formas `(A)` del título.
Si ese contexto tiene distintos nombres, la ciudad de oferta debe resolverlo
de forma inequívoca. Si no hay coincidencia, faltan campos o persiste ambigüedad,
muestra `Nombre del programa no disponible`.

El encabezado se lee siempre de **`NOMBRE_DEL_PROGRAMA`** del Excel SNIES.
El título solo ayuda a identificar el registro, nunca se convierte lingüísticamente
en carrera. `sniesCode` se publica separadamente cuando los candidatos coinciden
en un único código SNIES. El código original y `sourceId` siguen identificando
las rutas y registros existentes de Socrata.

Socrata `upr9-nkiz` conserva la identidad `sourceId`, títulos, ubicación de oferta,
modalidad, estado y paginación. El nombre bruto se conserva como evidencia sin
usarlo como encabezado. La importación es una instantánea oficial: no promete
actualizaciones de SNIES en tiempo real.

Instituciones: un único catálogo `n5yy-8nav` en memoria por cinco minutos, con
peticiones concurrentes compartidas, enriquece por código exacto `p_gina_web`,
`municipio_domicilio`, `departamento_domicilio` y `principal_seccional`.
Si falla el catálogo, los programas continúan disponibles sin inventar una URL.
No se hacen peticiones por tarjeta ni búsquedas web durante la navegación.

Las búsquedas y el orden A–Z requieren cruzar los nombres **antes** de paginar.
Para esas consultas, el catálogo de filas de Socrata se carga por bloques de
10.000 en memoria y se reutiliza durante cinco minutos. Las peticiones concurrentes
comparten la carga. Los filtros se aplican sobre todo el catálogo enriquecido,
después se ordena y finalmente se pagina. La primera búsqueda tras un reinicio
puede tardar más mientras se llena la caché. Las listas sin búsqueda ni orden
alfabético conservan la paginación directa de Socrata.

Los antiguos recolectores de enlaces curados permanecen fuera del flujo de UI.
Esta fase solo enlaza al sitio institucional; no ejecuta scraping de universidades.
