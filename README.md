# EduPlan

## Desarrollo local

### Requisitos

- Node.js 20.19+ (20.x) o 22.12+; recomendado Node 24, como CI.
  El mínimo sigue los [requisitos de Vite 8](https://v8.vite.dev/guide/).
- JDK 21+ disponible mediante JAVA_HOME o PATH, incluyendo java y javac.
- Docker Desktop o Docker Engine con Compose v2, activo y accesible sin sudo.
- Conexión a Internet para descargar dependencias y consultar el catálogo MEN.

### Primera ejecución

```bash
git clone https://github.com/Alendy-24/EduPlan.git
cd EduPlan
npm install
npm run dev
```

Abre **http://localhost:3005** cuando aparezca «EduPlan listo». La instalación
raíz instala ambos workspaces; no necesitas instalar dentro de cada carpeta
ni copiar archivos .env. Windows y Linux/WSL usan el mismo flujo. Instala y
ejecuta Node en el mismo sistema: no compartas node_modules entre Windows y WSL.

El arranque valida requisitos y puertos antes de lanzar servicios, levanta
PostgreSQL con Docker y espera al backend y a data-integration antes de Vite.
La primera ejecución puede tardar por las descargas de PostgreSQL y Maven.
Los logs detallados quedan en .tools/local-dev/dev.log.

Ctrl+C detiene los tres servicios. PostgreSQL conserva el contenedor y sus datos;
para detenerlo también: `npm run dev:db:stop`. Nunca se borran volúmenes automáticamente.

### Credenciales y opciones avanzadas

La contraseña aleatoria se conserva en .tools/local-dev/docker-database.json,
y Compose recibe .tools/local-dev/postgres.env. Ambos están ignorados por Git.
JWT_SECRET se genera en memoria en cada arranque: vuelve a iniciar sesión
después de reiniciar el backend. No necesitas secretos administrativos para
consultar el catálogo o usar cuentas. La sincronización administrativa sigue
deshabilitada hasta que configures sus tokens explícitamente.

Para usar una base externa, exporta **DB_URL**, **DB_USER** y **DB_PASSWORD**
juntas; DB_URL tiene formato jdbc:postgresql://host:puerto/base. Así no se usa
Docker ni se comprueba el puerto local de PostgreSQL. La base debe ser accesible
y permitir las migraciones Flyway; el backend informa los errores de conexión.
Un **JWT_SECRET** opcional debe ser Base64 de al menos 32 bytes aleatorios.

Los ejemplos frontend/.env.example y data-integration/.env.example documentan
overrides opcionales. docker/backend.env.example documenta configuración
avanzada y de producción; npm run dev no carga docker/backend.env ni docker/.env.
No cambies puertos internos con PORT o SERVER_PORT durante el arranque raíz: el
orquestador fija integración en 3001 y backend en 8080, y Vite usa 3005 estricto.

Para depurar Java, establece **EDUPLAN_DEBUG=1** en tu shell antes de
npm run dev y selecciona «EduPlan Backend (adjuntar después de npm run dev)»
en VS Code. El puerto JDWP 5005 se valida y escucha solo en loopback.
Sin esta opción no se abre el depurador; VS Code no es un requisito.

## Diagnóstico y troubleshooting

```bash
npm run doctor
```

Doctor no instala software, inicia servicios ni cambia permisos. Comprueba
Node, java/javac, Docker/Compose cuando corresponde y puertos 3005, 3001, 8080 y
5433. Acepta 5433 ocupado solo por el contenedor PostgreSQL válido de EduPlan.
Si 3005 está ocupado, cierra la instancia anterior; Vite no elige otro puerto.

### Problemas con Docker en WSL

Si Docker falta, instala Docker Desktop con integración WSL o Docker Engine
con Compose v2. Si el daemon está apagado, inícialo antes de npm run dev.
Ante acceso denegado al socket, revisa la pertenencia de tu usuario al grupo
docker. Normalmente un administrador lo resuelve con:

```bash
sudo usermod -aG docker $USER
```

Cierra la sesión y vuelve a entrar. Si usas WSL, puedes ejecutar
`wsl --shutdown` en PowerShell y volver a abrir WSL. Estos son pasos manuales:
EduPlan nunca ejecuta sudo ni modifica permisos.

### Bases creadas con el flujo anterior

La base Docker anterior se reutiliza si existe wsl-database.json; sus credenciales
se conservan en docker-database.json. El flujo nativo antiguo de Windows en
55432 se deja intacto y no se migra ni se detiene automáticamente. Puedes usarlo
mediante las tres variables DB_* si necesitas conservar ese entorno. Si existe
un volumen Docker sin sus credenciales, recupera el archivo original; no borres
el volumen para resolver un error de contraseña. Consulta [Docker](docker/README.md).

## Arquitectura y funcionalidad

EduPlan usa React/Vite y el catálogo real
de instituciones. Programas consulta data-integration; universidad, área, nivel,
departamento, ciudad, modalidades, nivel de formación, tipo de institución y orden
se aplican a todo el catálogo antes de paginar. Las modalidades admiten selección
múltiple (cualquiera de las elegidas), combinada con los demás filtros. Se envían
como parámetros repetidos `modality=Presencial&modality=Virtual`; los enlaces
anteriores con una sola modalidad siguen funcionando.
`GET /api/programs/filters` obtiene las opciones oficiales y las conserva cinco
minutos. La búsqueda prioriza nombre/título exacto, variantes similares y área.
La búsqueda ofrece hasta ocho sugerencias de nombres oficiales, tolera omisiones
y letras intercambiadas, y conserva los nombres publicados. Las sugerencias se filtran por
nivel e institución. Departamento y ciudad se seleccionan de DIVIPOLA; al cambiar
de departamento se limpia la ciudad; al cambiar el nivel académico se restablece
la formación. Universidad, área, formación y tipo de institución están en «Más
filtros». El sector se obtiene del catálogo institucional: «Oficial» se muestra
como pública y «Privado» como privada. Si esa fuente falla, una búsqueda por
sector informa el error en lugar de mostrar un falso resultado vacío. Los filtros
se conservan en la URL y cada etiqueta permite quitar una selección individual.
El orden predeterminado es por relevancia; también se puede ordenar por nombre
o universidad A–Z, sobre todo el catálogo antes de paginar.
Los resultados incluyen el total de ofertas y cantidades por filtro sobre todo
el catálogo. Cada cantidad permite cambiar ese filtro conservando los demás;
el departamento ignora la ciudad porque cambiarlo la limpia. Las búsquedas vacías
ofrecen acciones con cantidades verificadas para ampliar los filtros conservando
la carrera. Las filas con la misma identidad oficial SNIES y los mismos datos de
oferta se agrupan antes de paginar; sedes, modalidades, estados y planes diferentes
se conservan por separado. El detalle mantiene todas las filas de fuente.
El comparador organiza ubicación, modalidad/tiempo y formación, resalta diferencias
y conserva visibles los datos pendientes. Consulta las filas actuales por su identidad
exacta al abrir o actualizar; si una fila desaparece o la consulta falla, conserva el
resumen guardado y señala su estado. Incluye créditos, sector, sede, título y formación,
y accesos a fuentes oficiales para confirmar costos, admisión y plan de estudios.
«Mis prioridades» destaca ubicación, modalidad, duración y formación; las filas
prioritarias siguen visibles al ocultar coincidencias. Las notas por programa son
personales, están limitadas a 2000 caracteres y se guardan solo en el navegador,
separadas por cuenta e invitado. No se envían a las API ni se presentan como datos oficiales.
La favorita de la comparación también es local y se conserva por cuenta; quitar
esa opción o limpiar la comparación borra la favorita. El resumen destaca hasta
cuatro diferencias publicadas, prioriza los criterios elegidos y señala los datos
pendientes sin inferir cuál universidad es mejor. «Compartir comparación» permite
copiar o descargar un archivo de texto con las ofertas y sus enlaces exactos,
sin incluir notas ni la favorita. Si el portapapeles no está disponible, la vista
previa permite copiar manualmente. Los enlaces usan el origen actual del sitio.
Una barra de comparación en el catálogo y el detalle muestra hasta tres opciones,
permite quitarlas y reconoce distintas filas de la misma oferta agrupada.
Los resúmenes mantienen los nombres publicados y su procedencia. Las filas se
identifican por `sourceId`, porque un código de programa puede repetirse.

El navegador usa rutas del mismo origen. Vite envía instituciones, programas y
recomendaciones a data-integration; autenticación, cuenta y enlaces oficiales
al backend. Flyway aplica migraciones y Hibernate valida el esquema.

Las tarjetas de instituciones admiten logos de Logo.dev con una clave publicable
opcional, identidades compartidas entre sedes y excepciones manuales. Sin clave
o ante errores conservan el icono genérico. Consulta la
[configuración y revisión de logos](docs/institution-logos.md).

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

## Pruebas

Desde la raíz: `npm run test:dev`, `npm run typecheck --prefix data-integration`,
`npm run lint --prefix frontend`,
`npm run build --prefix frontend`, `node --test frontend/tests/*.test.mjs` y
`npm run test --prefix data-integration`. Desde `backend/src`:
`./mvnw test` (Windows: `.\mvnw.cmd test`) con JDK 21+ (la configuración JWT de pruebas ya está aislada). Las pruebas Java crean PostgreSQL embebido aislado; no usan la base
de desarrollo para insertar cuentas ni ejecutar migraciones.

`frontend/tests/browser-smoke.mjs` verifica comportamiento UI con fixtures
de red explícitos: requiere Vite activo y Playwright disponible en el entorno
de pruebas (o `EDUPLAN_PLAYWRIGHT_PATH` apuntando a un módulo ya instalado).
La URL predeterminada es http://localhost:3005 y puede cambiarse con
EDUPLAN_TEST_URL. No es un fallback de datos de la aplicación. Usa Edge headless y genera
capturas en `.tools/qa`, ignorado por Git. Comprueba 1440, 1024, 768 y 390 px.

### Publicación posterior

Servir el build con fallback de SPA a `index.html`, y reverse proxy del mismo
origen para `/api/institutions`, `/api/programs`, `/api/recommendations`, `/api/auth`, `/api/me` y `/api/program-links` hacia sus servicios.
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
