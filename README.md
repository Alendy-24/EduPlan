# EduPlan

Official repository for EduPlan for IT Project from Pontificia Universidad Javeriana Bogotá.

## Integración de catálogos

Spring Boot consume el JSON de `data-integration` y persiste instituciones y programas en PostgreSQL.
La API TypeScript consulta Datos Abiertos; no tiene credenciales ni acceso a la base.

### Búsqueda de instituciones en el frontend

Con `data-integration` activo en el puerto `3001`, ejecutar desde `frontend/`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir `http://localhost:5173/#/instituciones`. Sin configurar `VITE_DATA_INTEGRATION_URL`, Vite redirige solo `/api/institutions` a `http://127.0.0.1:3001` durante el desarrollo. La página consulta los catálogos públicos del MEN; no usa datos simulados.

Para desplegar frontend y data-integration en orígenes distintos, definir `VITE_DATA_INTEGRATION_URL=https://data.example.org` **al ejecutar `npm.cmd run build`** del frontend (sin `/api` al final). El build consultará `https://data.example.org/api/institutions`. En data-integration, configurar `FRONTEND_ORIGIN=https://app.example.org` para permitir ese origen exacto mediante CORS. Estos dominios son ejemplos, no direcciones de EduPlan. Si `VITE_DATA_INTEGRATION_URL` está vacía, el frontend usa `/api/institutions` en su propio origen y el despliegue debe dirigir **solo esa ruta** a data-integration; otras rutas `/api`, como `/api/admin/data-sync`, corresponden al backend principal. Los valores de `VITE_` quedan incluidos en el build y deben ajustarse antes de construirlo.

### Preparación y ejecución local

Requisitos: JDK 21 (con `JAVA_HOME` configurado), Node.js 22 o superior y PostgreSQL 14 o superior.
Los comandos parten de la raíz de EduPlan salvo que se indique lo contrario.

Para usar una base aislada en Docker desde WSL, seguir
[`docker/README.md`](docker/README.md). Esa configuración usa el puerto `5433`
para no interferir con PostgreSQL nativo en `5432` y mantiene las credenciales
locales fuera de Git.

En una terminal, iniciar la API:

```powershell
cd data-integration
npm.cmd ci
npm.cmd run build
npm.cmd start
```

En otra terminal, configurar el backend con una base PostgreSQL ya creada:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/eduplan_db'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = '<contraseña de PostgreSQL>'
$env:DATA_SYNC_ADMIN_TOKEN = '<secreto aleatorio de al menos 32 bytes>'
cd backend/src
.\mvnw.cmd spring-boot:run
```

Se puede generar el token con `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.
Configurar el mismo valor en la terminal del cliente; no guardarlo en Git. Spring lee las variables
del proceso: un archivo `.env` por sí solo no las carga. La contraseña anteriormente guardada en
el repositorio debe reemplazarse en PostgreSQL; quitarla del archivo no la elimina del historial.

En este equipo también se dejó un JDK portátil dentro de `.tools/jdk21/`, excluido de Git.
Se puede apuntar `JAVA_HOME` al directorio de ese JDK; no se cambió Java del sistema.

### Primera migración de una base existente

En una base vacía, Flyway ejecuta V1 y V2 automáticamente. Hibernate usa `validate` y ya no altera tablas.

Si la base fue creada previamente con Hibernate, hacer un respaldo y revisar las migraciones
en `backend/src/main/resources/db/migration`. Para adoptar ese esquema original, establecer
`$env:DB_BASELINE_EXISTING = 'true'` solamente en el primer arranque. El baseline es **0**,
por lo que V1 y V2 se ejecutan: crean tablas faltantes y agregan/amplían columnas sin borrar filas.
Luego retirar esa variable. Esquemas personalizados deben conciliarse antes; una estructura
incompatible o códigos duplicados causarán un error explícito en lugar de corregirse borrando datos.

Si alguna vez se ejecutó la versión anterior con claves SHA-256, la importación de programas
se detiene para que esos registros se concilien con la fuente. No es posible recuperar de un hash
las filas que ya se sobreescribieron. La migración conserva esos registros y sus relaciones.

### Sincronizar

Con ambos servicios activos, enviar la credencial mediante el encabezado `X-Sync-Token`:

```powershell
# En la terminal del cliente: configurar DATA_SYNC_ADMIN_TOKEN con el mismo valor del backend.
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/admin/data-sync' `
  -Headers @{ 'X-Sync-Token' = $env:DATA_SYNC_ADMIN_TOKEN }
```

| Operación | Endpoint |
| --- | --- |
| Instituciones y luego programas | `POST /api/admin/data-sync` |
| Solo instituciones | `POST /api/admin/data-sync/institutions` |
| Solo programas (instituciones deben existir) | `POST /api/admin/data-sync/programs` |

Sin token configurado de al menos 32 bytes, la operación devuelve 503. Sin credencial correcta,
devuelve 401 antes de escribir. En despliegues remotos usar HTTPS y restringir esta ruta administrativa.
La protección pertenece a estas operaciones; no implementa un sistema de login para el resto de EduPlan.

La solicitud es síncrona y una carga completa puede tardar varios minutos. Un bloqueo de PostgreSQL
impide sincronizaciones simultáneas incluso entre instancias del backend; otra petición recibe 409.
Cada página se confirma en su propia transacción. No se mantiene una transacción durante la consulta HTTP.

El reporte devuelve `pages`, `created`, `updated`, `skipped`, `reviewRequired` y `skippedReasons`.
`updated` cuenta registros existentes procesados, incluso si su contenido no cambió.
Las razones de omisión son `invalidRecord`, `duplicateInstitutionCode` y `missingInstitution`.
No se crean programas huérfanos. Los omitidos por institución faltante pueden importarse después
de resolver su institución. No se infieren vínculos por nombre.

Un error devuelve `committedProgress` con las páginas confirmadas antes del fallo. Puede repetirse
la petición: el registro con la misma identidad se actualiza y conserva su ID local, costo,
requisitos y descripción. No se eliminan registros ausentes de la fuente.

### Identidad y calidad de la fuente

- Instituciones: `codigo_fuente` corresponde al código de institución.
- Programas: `clave_fuente` guarda `upr9-nkiz:<:id de Socrata>`. El código publicado se conserva
  en `codigo_fuente`, pero **no se trata como un código SNIES validado ni como una clave única**.
- Filas diferentes con el mismo código, institución, municipio y modalidad permanecen separadas.
- Si el nombre está vacío, es NA/N/A o coincide con departamento/municipio, se conserva en
  `nombre_original`, se guarda el título en `titulo_otorgado` y se marca `requiere_revision=true`.
  `nombre` usa ese título con `origen_nombre=AWARDED_TITLE`; no es un nombre oficial certificado.
  Si tampoco hay título, se usa una etiqueta de pendiente con `origen_nombre=UNAVAILABLE`.
- Esta detección es una regla limitada de calidad, no una validación semántica completa.
  El consumidor debe mostrar el origen y la advertencia al presentar nombres pendientes.
- No se mezclan valores ni se deducen nombres de carreras a partir de un título.

El orden incluye un identificador único para paginar, como recomienda
[Socrata](https://dev.socrata.com/docs/queries/order).
No existe una instantánea transaccional entre páginas HTTP: si el proveedor cambia el dataset
durante la carga, se debe repetir la sincronización. Si reemplaza filas y regenera `:id`,
hay que conciliar las identidades antes de otra carga; no se garantiza identidad perpetua.
Esta integración conserva filas publicadas, no asegura que cada fila represente una carrera distinta.

### Configuración adicional

| Variable | Predeterminado |
| --- | --- |
| `DATA_INTEGRATION_BASE_URL` | `http://localhost:3001` |
| `DATA_INTEGRATION_PAGE_SIZE` | `100` (1–100) |
| `DATA_INTEGRATION_MAX_PAGES` | `5000` (límite para detectar cargas anómalas) |
| `DB_BASELINE_EXISTING` | `false` |
| `DATA_SYNC_ADMIN_TOKEN` | Sin valor: sincronización deshabilitada |
| `DB_PASSWORD` | Obligatoria |

El cliente HTTP tiene 3 segundos para conectar y 15 segundos de espera de lectura.
Alcanzar el límite de páginas se informa como carga incompleta, no como éxito.

### Verificación

```powershell
# Desde data-integration
npm.cmd test

# Desde backend/src con JDK 21
.\mvnw.cmd -B -ntp test
```

Las pruebas Java inician un PostgreSQL temporal en un puerto disponible y un servidor HTTP local
con datos controlados. Ignoran DB_URL y no usan eduplan_db. Prueban migraciones, validación JPA,
colisiones de identidad, actualización, rollback, fallos parciales, paginación, concurrencia
y autorización HTTP. Cierran la base temporal al finalizar. Las primeras ejecuciones descargan
dependencias y binarios de prueba; no requieren Docker.
