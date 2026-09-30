# EduPlan

## Desarrollo local completo en Windows

Requisitos: Node.js con las dependencias del proyecto instaladas, PowerShell 7,
JDK 21 o superior y los binarios de PostgreSQL. No usar el Java 8 del PATH.
El script detecta el JDK 21 en `.tools/jdk21/jdk-21.0.12.1+1`; en otro equipo,
detecta también los JDK compatibles en `%USERPROFILE%/.jdks`, o usa `JAVA_HOME`.
PostgreSQL puede obtenerse de la instalación local o del caché de las pruebas Maven.

Desde la raíz de `EduPlan`, en una sola terminal:

```powershell
npm install
npm run dev
```

Esto inicializa o reutiliza **solo** `.tools/local-dev/postgres-data`, inicia
PostgreSQL en `127.0.0.1:55432`, usa `eduplan_local` (o `postgres` en la instancia
aislada cuando el paquete embebido no incluye `psql`) y ejecuta Maven
con Spring Boot en `127.0.0.1:8080`. Flyway aplica las migraciones y Hibernate
valida el esquema. No conecta a PostgreSQL personal en `5432`, no importa
credenciales de Docker y no ejecuta sincronización administrativa.
Si PostgreSQL está instalado en otra carpeta:

```powershell
pwsh -NoProfile -File scripts/dev-backend.ps1 -PostgresBin 'C:\ruta\PostgreSQL\bin'
```

Abre `http://127.0.0.1:5173`. Este comando inicia Vite, data-integration (`3001`)
y el backend (`8080`). Espera a que aparezca `Started BackendApplication` antes
de registrar una cuenta. En WSL con Node de Windows se utiliza el mismo flujo;
con Node de Linux configura previamente Java, PostgreSQL, `DB_PASSWORD` y `JWT_SECRET`.
Si un puerto está ocupado, detén la ejecución anterior del mismo proyecto;
no abras una segunda instancia. Los proxies API están en Vite.
El catálogo externo requiere conexión a Internet.

La contraseña PostgreSQL generada se guarda únicamente en
`.tools/local-dev/database.json`, ignorado por Git. `JWT_SECRET` se genera
aleatoriamente solo en el entorno del proceso: no se escribe en archivos.
Al reiniciar el backend, inicia sesión de nuevo. Ctrl+C detiene los servicios;
la base aislada conserva sus datos. Para detener también esa instancia:

```powershell
pwsh -NoProfile -File scripts/stop-dev-db.ps1
```

Docker Compose sigue disponible como alternativa para equipos con Docker
activo, pero no es necesario para este flujo nativo aislado.

### Validación de ejecución

Con los servicios activos y Playwright instalado en el entorno de pruebas:

```powershell
node frontend/tests/live-smoke.mjs
node frontend/tests/browser-smoke.mjs
node frontend/tests/accessibility-smoke.mjs
node frontend/tests/programs-filters-smoke.mjs
node frontend/tests/account-sync-smoke.mjs
```

`live-smoke` usa los servicios reales y crea cuentas desechables `@example.test`
en la base aislada. No ejecutarlo contra una base personal o de producción.
`browser-smoke` usa fixtures explícitos para casos deterministas. Si el módulo
Playwright está fuera del proyecto, configura `EDUPLAN_PLAYWRIGHT_PATH` con
su ruta. No se instala una dependencia de producción para estas pruebas.
Capturas e informes quedan en `.tools/qa`, ignorado por Git.

## Frontend conectado

La rama `feature/redesign-ui-antislop` conserva React/Vite y el catálogo real
de instituciones. Programas consulta data-integration; universidad, área, nivel,
ciudad, modalidad y orden se aplican a todo el catálogo antes de paginar.
`GET /api/programs/filters` obtiene las opciones oficiales y las conserva cinco
minutos. La búsqueda prioriza nombre/título exacto, variantes similares y área.
Los resúmenes mantienen los nombres publicados y su procedencia. Las filas se
identifican por `sourceId`, porque un código de programa puede repetirse.

Para desarrollo, `npm run dev` inicia frontend, integración y Java.
Vite proxifica `/api/institutions` y `/api/programs` a `3001`, y
`/api/auth`, `/api/me` y `/api/program-links` a `8080`. `VITE_DATA_INTEGRATION_URL` conserva su uso existente para
instituciones; programas y autenticación utilizan rutas del mismo origen.

El backend requiere `DB_PASSWORD` y `JWT_SECRET`: este último debe ser Base64
de al menos 32 bytes aleatorios, generado localmente (por ejemplo con
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`).
Nunca usar la clave de las pruebas en desarrollo o producción. El ejemplo
`docker/backend.env.example` documenta las variables; no se modifican archivos
locales de credenciales automáticamente.

Login y registro usan autenticación real. Registro requiere `name`, `email`
y `password` desde la interfaz; la API conserva soporte de teléfono.
`expiresIn` está expresado en milisegundos. La sesión se conserva en
`sessionStorage` hasta su vencimiento; cerrar sesión elimina esa sesión local,
sin revocación del JWT ni refresh. `/dashboard` y `/perfil` requieren sesión.
La restauración usa la respuesta de autenticación y su vencimiento; las API
personales comprueban el JWT y la cuenta activa, y un rechazo 401 invalida la sesión. OAuth y recuperación no
están disponibles. La protección React no sustituye autorización de backend.

Guardados e intereses se sincronizan por cuenta mediante `/api/me/saved` y
`/api/me/interests`. La migración V5 crea tablas personales independientes del
catálogo importado. Cada solicitud usa la cuenta firmada en el JWT, con
validación de enlaces, resúmenes y opciones personales. Los cambios pendientes
se conservan localmente y se reintentan; si el almacenamiento está bloqueado,
se conservan en memoria durante la visita. Los guardados locales anteriores de
esa cuenta se migran al servidor. Los datos de invitado nunca se transfieren.
La comparación (máximo tres) continúa local, separada por cuenta.

Desde el dashboard se pueden comprobar cambios en resúmenes guardados contra
el catálogo actual y actualizarlos explícitamente. Programas muestra el sitio
institucional publicado por MEN y preguntas para verificar costos/admisión;
no inventa información académica ausente. Los enlaces específicos se muestran
cuando han sido verificados en el registro independiente de enlaces oficiales.
Consulta [el flujo de recopilación y revisión](docs/program-links.md).

Becas contiene una selección editorial de ocho programas reales en
`frontend/src/data/scholarships.js`, con requisitos, cobertura, fuente oficial,
calendario y fecha de revisión. Su actualización es manual: deben revisarse las
fuentes y `verifiedAt` al editar convocatorias. Las fechas pasadas se muestran
cerradas y las fechas desconocidas exigen consultar vigencia. Las rutas
históricas de demostración mantienen datos ficticios aislados y avisos.

### Verificación

Desde la raíz: `npm run lint --prefix frontend`,
`npm run build --prefix frontend`, `node --test frontend/tests/*.test.mjs` y
`npm run test --prefix data-integration`. Desde `backend/src`:
`./mvnw test` (Windows: `.\mvnw.cmd test`) con Java 21 y un `JWT_SECRET` exclusivo
de pruebas. Las pruebas Java crean PostgreSQL embebido aislado; no usan la base
de desarrollo para insertar cuentas ni ejecutar migraciones.

`frontend/tests/browser-smoke.mjs` verifica comportamiento UI con fixtures
de red explícitos: requiere Vite activo y Playwright disponible en el entorno
de pruebas (o `EDUPLAN_PLAYWRIGHT_PATH` apuntando a un módulo ya instalado).
No es un fallback de datos de la aplicación. Usa Edge headless y genera
capturas en `.tools/qa`, ignorado por Git. Comprueba 1440, 1024, 768 y 390 px.

### Publicación posterior

Servir el build con fallback de SPA a `index.html`, y reverse proxy del mismo
origen para `/api/institutions`, `/api/programs`, `/api/auth`, `/api/me` y `/api/program-links` hacia sus servicios.
No publicar asumiendo que `vite preview` proporciona un proxy de producción.
La configuración CORS actual de integración solo cubre instituciones; no
cambiar programas a una URL de otro origen sin preparar ese transporte.

## Integrantes
- Salomé Ávila
- Daniel Cedeño
- Jose Cepeda
- Alejandro Corredor
- Sebastian Ramirez

## Diagramas

# Diagrama de Clases

<img width="848" height="646" alt="diagrama-de-clases-EduPlan" src="https://github.com/user-attachments/assets/f019621b-fc38-402c-8a10-9cfe1f6f1d98" />

# Diagrama Entidad-Relación

<img width="1600" height="657" alt="diagrama-entidad-relacion" src="https://github.com/user-attachments/assets/64658d2d-fad4-41ea-a636-f6333e58bb18" />

# Diagrama Relacional

<img width="1600" height="983" alt="diagrama-relacional" src="https://github.com/user-attachments/assets/95501677-0901-4fa9-be1f-bd155dda5a0d" />

# Diagrama de Componentes 

<img width="1667" height="886" alt="Diagrama_de_Componentes_EduPlan" src="https://github.com/user-attachments/assets/79628769-47d6-415b-9e11-fe3d106ece6b" />

# Ejecución 

## Instalar dependencias de Node.js

Desde la raíz:
```
npm install
```
Del frontend:

```
cd frontend
npm install
cd ..
```
Servicio de integración:

```
cd data-integration
npm install
cd ..
```

## Iniciar Frontend e Integración de datos

Desde la raíz del repositorio
```
npm run dev
```

## Iniciar backend 
En otra terminal

Iniciar servicio postgresql: 

```
cd docker
cp .env.example .env
cp backend.env.example backend.env
```
Editar archivo `.env` y `backend.env`
`.env`

```
POSTGRES_DB=eduplan_db
POSTGRES_USER=eduplan
POSTGRES_PASSWORD=tu_contraseña_local
POSTGRES_PORT=5433
```

`backend.env`
```
DB_URL=jdbc:postgresql://localhost:5433/eduplan_db
DB_USER=eduplan
DB_PASSWORD=una_contraseña_local
DATA_SYNC_ADMIN_TOKEN=un_token_local_de_al_menos_32_caracteres
```
Iniciar contenedor y PostgreSQL:

```
sudo docker compose up -d
sudo docker compose ps
```

Ejecutar backend Java:

```
cd backend/src
set -a
source ../../docker/backend.env
set +a
./mvnw spring-boot:run
```

En Windows para establecer las variables manualmente:

```
$env:DB_URL="jdbc:postgresql://localhost:5433/eduplan_db"
$env:DB_USER="eduplan"
$env:DB_PASSWORD="una_contraseña_local"
$env:DATA_SYNC_ADMIN_TOKEN="un_token_local_de_al_menos_32_caracteres"

cd backend/src
.\mvnw.cmd spring-boot:run
```

Linux: 

```
export DB_URL="jdbc:postgresql://localhost:5433/eduplan_db"
export DB_USER="eduplan"
export DB_PASSWORD="tu_contraseña_segura_aqui"
export DATA_SYNC_ADMIN_TOKEN="un_token_aleatorio_de_al_menos_32_caracteres"
```






