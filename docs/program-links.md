# Enlaces oficiales de programas

El detalle consulta `GET /api/program-links?sourceId=upr9-nkiz:row-…` en Java.
La respuesta identifica la fila: `sourceId`, `status` y, solamente para `VERIFIED`,
`url` y `checkedAt` ISO. `officialName` se publica cuando un encabezado académico
único coincide con el título de esa página verificada. El detalle, listado y
comparación priorizan ese nombre; el título otorgado y los campos originales
del MEN se conservan. No se convierte automáticamente «Arquitecto» en «Arquitectura».
`GET /api/program-links/batch?sourceId=…&sourceId=…` consulta hasta 100 filas
para los listados y devuelve `data` con el mismo contrato, sin evidencia privada.
Otros estados públicos son `PENDING`, `NOT_FOUND` y
`UNAVAILABLE`; no exponen candidatos, evidencia ni decisiones. Si Java falla,
la interfaz permite reintentar y conserva el acceso institucional.
El proxy de producción debe llevar `/api/program-links` a Java, igual que
`/api/auth` y `/api/me`. No publicar las rutas administrativas mediante el proxy público.

## Recopilar sin modificar PostgreSQL

Desde la raíz del repositorio, después de instalar dependencias de data-integration:

```sh
npm run build --prefix data-integration
node data-integration/tools/program-links/cli.mjs collect --out .tools/program-links/run
```

El comando descarga una instantánea completa de ambos catálogos MEN y recorre
todas las instituciones presentes en programas, incluidas las que no publican
una web utilizable. No ejecuta sincronización ni escribe en Java.
Los archivos se guardan bajo el directorio indicado (usar `.tools`, ignorado por Git):

- `catalog.json`: registros normalizados separados por institución.
- `report.json`: intentos, errores, necesidad de adaptador, límites y cobertura.
- `report.md`: resumen legible, enlaces verificados y todas las instituciones intentadas.
- `candidates.json`: candidatos por `sourceId` y URL, con evidencia y fecha.

Cada institución terminada guarda un checkpoint. Repetir el comando con el mismo
directorio reanuda los casos aún no procesados; `--pending` vuelve a intentar los
casos sin resolver. `--institution 1813` restringe una ejecución. Para actualizar
el catálogo, utilizar un directorio nuevo: la reanudación conserva su instantánea.

Por defecto se consultan hasta 30 páginas y 6 mapas por institución, timeout
de 8 segundos, pausa mínima de 600 ms y una petición simultánea por host.
Tres instituciones se procesan a la vez. `--concurrency` admite entre 1 y 12
instituciones, conservando las colas y pausas de cada host. Para reanudar un
recorrido de pendientes interrumpido, `--pending --resume-since FECHA_ISO`
omite instituciones con checkpoint posterior a esa fecha.
`--max-pages`, `--max-sitemaps` y
`--timeout` ajustan límites; los recorridos truncados se señalan. El descubrimiento
inicial puede usar límites menores y ampliarse después, sin confundir intentos
de todas las instituciones con cobertura completa de sus carreras.

Se consulta `robots.txt` antes de páginas y destinos de redirección. 403, errores
de red y robots inaccesibles detienen ese origen; ausencia 404/410 se admite.
Los adaptadores iniciales añaden directorios oficiales de Uniandes, Javeriana y
Nacional. HTML y XML se analizan sin ejecutar scripts. Páginas dinámicas quedan
pendientes; esta versión no incorpora un navegador automatizado.

Las conexiones validan todas las direcciones DNS, bloquean redes privadas y
reservadas, fijan una IP pública a la conexión y comprueban cada redirección.
Solo admiten dominios institucionales, puertos web, respuestas sin compresión
de hasta 2 MB, tiempo limitado y máximo cuatro redirecciones.

La igualdad de un código publicado con un SNIES **no verifica identidad**.
La aprobación automática exige identidad única y completa sin contradicciones,
o un SNIES previamente contrastado de forma independiente. La identidad incluye
la sede y modalidad: un título repetido en otra ciudad no invalida una combinación
inequívoca; dos filas con la misma combinación quedan pendientes. `--contrast FILE`
admite un JSON revisado por administrador de `sourceId` a SNIES como cadena;
conservar aparte la fuente oficial y fecha de esa revisión. No generar esa
correspondencia a partir del código del catálogo. Coincidencias aproximadas,
campos dinámicos, sedes ambiguas o varias URLs quedan `PENDING`.
Los adaptadores conservan el nivel de formación publicado. Doctorado, Maestría
y Especialización se clasifican como Posgrado cuando aparecen explícitamente
en la cabecera académica; una contradicción entre título y nivel de formación
impide la verificación automática.

## Importación y revisión administrativa

V6 crea tablas independientes de dominios, candidatos e historial. Configurar
`PROGRAM_LINKS_ADMIN_TOKEN` en Java y en el entorno del comando: secreto aleatorio
de al menos 32 bytes, diferente de `DATA_SYNC_ADMIN_TOKEN`. No pasarlo como argumento
ni guardarlo en reportes. Sin secreto la administración queda deshabilitada.
`PROGRAM_LINKS_BACKEND_URL` usa `http://127.0.0.1:8080`; un backend remoto requiere
HTTPS. Los comandos no siguen redirecciones que puedan exponer el secreto.

```sh
node data-integration/tools/program-links/cli.mjs domains --out .tools/program-links/run
```

Revisar `domains-proposed.json` contra páginas oficiales y copiar la selección
aprobada a `approved-domains.json`. Un dominio autoriza sus subdominios; no aprobar
sufijos generales como `edu.co`. Revisar los candidatos antes de importar.

```sh
node data-integration/tools/program-links/cli.mjs import --file .tools/program-links/run/candidates.json --domains .tools/program-links/run/approved-domains.json
node data-integration/tools/program-links/cli.mjs export --file .tools/program-links/run/pending.json
node data-integration/tools/program-links/cli.mjs approve --id ID_SHA256 --reason "Institución, programa, sede y modalidad contrastados"
node data-integration/tools/program-links/cli.mjs reject --id ID_SHA256 --reason "Corresponde a otra sede"
node data-integration/tools/program-links/cli.mjs history --id ID_SHA256
```

`/api/admin/program-links` comprueba `X-Program-Links-Token` sobre el controlador
efectivo, independientemente de JWT y token de sincronización. `POST /domains`
registra dominios; `POST /import` acepta lotes de hasta 100; `GET ?status=PENDING&offset=0`
exporta páginas de 100; `POST /{id}/decision` aprueba/rechaza; `GET /{id}/history`
devuelve auditoría. No se altera `SyncAuthorization`.

La clave de candidato es SHA-256 de `sourceId` y URL. Importaciones iguales o
más antiguas se ignoran; cada lote es transaccional y las decisiones se serializan
por fila de fuente. La revisión manual prevalece sobre recopilaciones posteriores.
Aprobar una URL sustituye otros enlaces verificados de esa fila. Dos enlaces
automáticos distintos nunca se resuelven silenciosamente al primero.

## Mantenimiento semanal

```sh
node data-integration/tools/program-links/cli.mjs export --status VERIFIED --file .tools/program-links/run/verified.json
node data-integration/tools/program-links/cli.mjs check --file .tools/program-links/run/verified.json --domains .tools/program-links/run/approved-domains.json --out .tools/program-links/run
```

`check` produce `maintenance.json` y `maintenance-errors.json`, sin importar.
404/410 y páginas que ya no identifican el programa proponen `UNAVAILABLE`.
Fallos temporales, bloqueos y evidencia insuficiente conservan la última verificación.
Una retirada puede afectar un enlace manual; su publicación posterior requiere
nueva aprobación administrativa.

Revisar resultados y ejecutar `import` con `maintenance.json`. Configurar el ciclo
semanal al desplegar; no se crean tareas programadas en el equipo de desarrollo.
Repetir `collect --pending` para ampliar cobertura y revisar adaptadores señalados.

## Verificación

`npm run test --prefix data-integration` cubre extracción, identidad, ambigüedad,
robots, URL/IP, límites y mantenimiento. `ProgramLinksIntegrationTest` arranca
PostgreSQL embebido para verificar V6, protección, importación, decisiones e historial.
`frontend/tests/program-links-smoke.mjs` utiliza fixtures explícitos de red y
comprueba registro exacto, fallback institucional, pestañas, fallos y cuatro anchos.
`validate-real.mjs DIR` consulta páginas reales de las tres universidades y registra
evidencia local. Los fallos operativos se reportan; no se inventan enlaces ni
se aprueban basándose solamente en el nombre.
