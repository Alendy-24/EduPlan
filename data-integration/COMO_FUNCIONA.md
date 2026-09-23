# Integración de datos educativos de EduPlan

## 1. Objetivo

Este servicio consulta información pública oficial de instituciones y programas de educación superior en Colombia, transforma los nombres de las columnas externas a propiedades sencillas y devuelve JSON para EduPlan.

No almacena información. El backend Spring Boot consume este JSON y persiste los catálogos en PostgreSQL. La configuración y las limitaciones están en el [README principal](../README.md).

## 2. Flujo general

1. Un cliente solicita un endpoint de EduPlan.
2. La ruta valida filtros y paginación.
3. El servicio construye una consulta Socrata.
4. `fetch` consulta datos.gov.co con un tiempo máximo de espera.
5. El servicio transforma las columnas oficiales a nombres sencillos.
6. Express devuelve el resultado como JSON.

## 3. Fuente de instituciones

- Dataset: `MEN_INSTITUCIONES EDUCACIÓN SUPERIOR`
- Dataset ID: `n5yy-8nav`
- Página: <https://www.datos.gov.co/d/n5yy-8nav>
- API JSON: <https://www.datos.gov.co/resource/n5yy-8nav.json>

Columnas utilizadas: `c_digo_instituci_n`, `nombre_instituci_n`, `sector`, `car_cter_acad_mico`, `departamento_domicilio`, `municipio_domicilio`, `direcci_n_domicilio`, `tel_fono_domicilio`, `estado` y `p_gina_web`.

## 4. Fuente de programas

- Dataset: `MEN_PROGRAMAS_DE_EDUCACIÓN_SUPERIOR`
- Dataset ID: `upr9-nkiz`
- Página: <https://www.datos.gov.co/d/upr9-nkiz>
- API JSON: <https://www.datos.gov.co/resource/upr9-nkiz.json>

Columnas utilizadas: `:id` (como `source_row_id`), `codigoprograma`, `codigoinstitucion`, `nombreinstitucion`, `nombreprograma`, `nombretituloobtenido`, `nombrenbc`, `nombrenivelacademico`, `nombrenivelformacion`, `nombremetodologia`, `cantidadperiodos`, `nombreperiodicidad`, `nombredepartprograma`, `nombremunicipioprograma` y `nombreestadoprograma`.

La fuente presenta inconsistencias en nombres y códigos de programas. Se conservan los valores publicados en `rawName` y `code`. Si el nombre coincide con el departamento/municipio o está vacío/NA, `name` usa el título otorgado, `nameOrigin=AWARDED_TITLE` y `reviewRequired=true`. Si no hay título, el nombre indica que está pendiente. Esta regla no certifica los demás nombres. `sourceId` combina el dataset con `:id`: distingue filas publicadas, pero no certifica códigos SNIES ni carreras únicas.

## 5. Qué hace cada archivo

- `src/config/sources.ts`: contiene nombres, IDs y URLs de los datasets.
- `src/models/institution.ts`: define el JSON sencillo de una institución y sus filtros.
- `src/models/program.ts`: define el JSON sencillo de un programa y sus filtros.
- `src/services/institutions.service.ts`: consulta y transforma instituciones.
- `src/services/programs.service.ts`: consulta y transforma programas.
- `src/routes/institutions.routes.ts`: atiende los endpoints de instituciones.
- `src/routes/programs.routes.ts`: atiende los endpoints de programas.
- `src/utils/http.ts`: realiza peticiones externas con timeout y valida la paginación.
- `src/app.ts`: configura Express y las rutas.
- `src/index.ts`: lee el puerto e inicia el servidor.

## 6. Instalación e inicio

Desde `data-integration/`:

```bash
npm install
npm run build
npm start
```

Para desarrollo con recarga automática:

```bash
npm run dev
```

El puerto predeterminado es `3001`. Se puede copiar `.env.example` como `.env`. `SOCRATA_APP_TOKEN` es opcional y nunca debe contenerse en el repositorio.

## 7. Endpoints y pruebas manuales

### Health check

```text
GET http://localhost:3001/health
```

### Instituciones

```text
GET http://localhost:3001/api/institutions
GET http://localhost:3001/api/institutions/1101
GET http://localhost:3001/api/institutions?municipality=bogota
GET http://localhost:3001/api/institutions?name=nacional&page=1&limit=20
GET http://localhost:3001/api/institutions?name=javeriana&municipality=bogota&program=sistemas&modality=Presencial&sector=Privado&includeModalities=true
```

### Programas

```text
GET http://localhost:3001/api/programs
GET http://localhost:3001/api/programs/5
GET http://localhost:3001/api/programs?name=sistemas
GET http://localhost:3001/api/programs?municipality=bogota
GET http://localhost:3001/api/programs?modality=presencial
GET http://localhost:3001/api/programs?institutionCode=1101
GET http://localhost:3001/api/programs?page=1&limit=20
```

`page` comienza en 1. `limit` acepta valores entre 1 y 100. La API convierte estos valores a `$limit` y `$offset` de Socrata.

La lista de instituciones también acepta `program`, `modality`, `sector` y `academicCharacter`. Los dos primeros cruzan los códigos publicados por los catálogos de programas e instituciones y consideran solo programas con estado `Activo`; los filtros se combinan. `includeModalities=true` agrega las modalidades de esos programas activos a cada resultado. Se solicita solo desde el frontend para no añadir consultas al flujo de sincronización del backend. Presupuesto, campus y enfoque institucional no están en estos catálogos.

La consulta `GET /api/programs/:code` devuelve un objeto con `data` y `returned`, porque el dataset oficial puede contener varios registros para el mismo código de programa.

## 8. Ejemplo de una institución

```json
{
  "code": "1101",
  "name": "UNIVERSIDAD NACIONAL DE COLOMBIA",
  "sector": "Oficial",
  "academicCharacter": "Universidad",
  "department": "Bogotá D.C.",
  "municipality": "Bogotá, D.C.",
  "address": "Carrera 45 #26 - 85",
  "phone": "3165000",
  "status": "Activa en la Fecha de Actualizacion",
  "website": "www.unal.edu.co"
}
```

## 9. Ejemplo de un programa

```json
{
  "code": "5",
  "sourceId": "upr9-nkiz:row-ejemplo",
  "rawName": "Antioquia",
  "awardedTitle": "PSICOLOGO",
  "knowledgeArea": "Psicología",
  "nameOrigin": "AWARDED_TITLE",
  "reviewRequired": true,
  "institutionCode": "1201",
  "institutionName": "UNIVERSIDAD DE ANTIOQUIA",
  "name": "PSICOLOGO",
  "academicLevel": "Pregrado",
  "educationLevel": "Universitaria",
  "modality": "Presencial",
  "periodCount": "10",
  "periodicity": "Semestral",
  "department": "Antioquia",
  "municipality": "Sonsón",
  "status": "Inactivo"
}
```

El identificador del ejemplo es ilustrativo. `name` es el título otorgado de la fuente, no un nombre oficial de carrera verificado. El nombre original sigue disponible en `rawName`.

## 10. Ejemplo paso por paso

Para `GET /api/programs?municipality=bogota&page=2&limit=10`:

1. Express recibe la petición.
2. La ruta valida `page=2` y `limit=10`.
3. El servicio prepara el filtro sobre `nombremunicipioprograma` y contempla la variante `Bogotá`.
4. Socrata recibe `$limit=10` y `$offset=10`.
5. La respuesta oficial se transforma al modelo `Program`.
6. EduPlan devuelve `data`, `page`, `limit` y `returned`.

## 11. Qué no hace este servicio

No implementa PostgreSQL, ORM, tablas, migraciones, usuarios, login, favoritos, recomendaciones, imágenes, Google Places, Wikimedia, Redis, Docker, autenticación, cron jobs ni sincronización automática. Tampoco modifica frontend, backend o database.

## 12. Persistencia en EduPlan

Este servicio continúa sin conectarse directamente a PostgreSQL. Esa separación es intencional: Spring Boot consume sus endpoints y controla las transacciones, las relaciones y la actualización idempotente de los registros.

Con ambos servicios activos, la sincronización se inicia en el backend con:

```text
POST http://localhost:8080/api/admin/data-sync
```

La URL de este servicio puede configurarse en el backend mediante `DATA_INTEGRATION_BASE_URL`.

La petición requiere el encabezado `X-Sync-Token`, cuyo valor se configura en el backend con
`DATA_SYNC_ADMIN_TOKEN`. Consulte el [README principal](../README.md) para migraciones,
credenciales, reportes de omisiones y tratamiento de fallos parciales.
