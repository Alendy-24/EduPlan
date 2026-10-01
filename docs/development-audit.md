# Auditoría del desarrollo local de EduPlan

Fecha: 30 de septiembre de 2026.

## Hallazgos y decisiones

- El árbol Git estaba limpio antes de empezar. Se revisaron los manifiestos,
  los tres lockfiles, Vite, los servicios frontend, integración, Maven,
  application.properties, scripts de arranque, Compose, ejemplos, README,
  VS Code, smoke tests y GitHub Actions.
- Windows dependía de PowerShell 7, detección de JDK y PostgreSQL nativo en 55432;
  Linux/WSL ejecutaba Compose en 5433. Se sustituyeron por módulos Node compartidos
  y Maven Wrapper; solo su invocación cmd/sh depende del sistema operativo.
- Se retiraron dev-backend.ps1, dev-backend-linux.mjs y stop-dev-db.ps1. La base
  nativa anterior se conserva y puede usarse mediante las variables DB_*.
- Se conserva concurrently porque ya resuelve la terminación de árboles de
  procesos en Windows/Linux. Se usa su API con logs en un archivo ignorado;
  se requiere 9.2.4 para la opción killOthersOn. No se añadieron dependencias.
  dotenv sigue siendo útil para overrides de integración; las demás dependencias
  funcionales permanecen fuera del alcance del refactor.
- Node engines sigue el mínimo real de Vite 8: ^20.19.0 || >=22.12.0.
  CI usa Node 24 y una sola instalación npm ci desde la raíz, sin Docker.
  Se conservaron y actualizaron los tres lockfiles.
- La documentación tenía instalaciones repetidas, arranques en varias terminales
  y configuración manual obligatoria. Ahora hay un único inicio recomendado.
- Vite escucha en localhost:3005 con strictPort. Sus seis proxies conservan
  rutas relativas del navegador. Se mantienen las IPs internas IPv4 para evitar
  ambigüedad con localhost/IPv6 y las IPs deliberadas de SSRF y pruebas Java.
- Preflight valida java y javac, Docker/daemon/Compose cuando corresponden y
  puertos. La configuración parcial de una base externa falla. Un contenedor
  ajeno, o un contenedor detenido mientras otro proceso ocupa 5433, no se acepta.
- La contraseña local aleatoria persiste en .tools/local-dev/docker-database.json;
  el JWT aleatorio solo vive en el entorno del backend. No se leen los .env
  Docker antiguos. No se generan tokens administrativos ni se sincroniza automáticamente.
- Los volúmenes sin credenciales se preservan. El arranque comprueba la contraseña
  mediante TCP a la dirección del contenedor: pg_isready y una conexión local
  dentro del contenedor pueden aceptar conexiones sin verificar la contraseña.
- El smoke de accesibilidad contenía un selector .photo-credit obsoleto; se
  sustituyó por el texto real del footer y se añadió un error explícito si falta.

## Validación ejecutada

| Comando / comprobación | Resultado |
| --- | --- |
| npm install (raíz Windows) | Correcto; ambos workspaces instalados; 0 vulnerabilidades |
| npm install sin node_modules en carpeta de validación Windows | Correcto; npm ls confirma ambos workspaces |
| npm ci con manifiesto y lockfile finales en carpeta de validación | Correcto |
| npm install desde copia limpia en Ubuntu/WSL | Correcto |
| npm run test:dev | 11 pruebas correctas |
| npm run doctor (Windows, entorno original) | Detecta Java 8 y Docker ausente antes del arranque |
| npm run dev (Windows, entorno original) | Falla en preflight, sin iniciar servicios |
| npm run doctor (JDK 21 y DB externa, Windows) | Correcto; no requiere Docker |
| npm run dev (JDK 21 y DB externa, Windows) | Correcto; publica localhost:3005 |
| npm run doctor (Ubuntu/WSL) | Correcto: Node 22.22.1, JDK 21, Docker y Compose |
| npm run dev (Ubuntu/WSL, PostgreSQL nuevo) | Correcto; contraseña automática, Flyway y tres servicios |
| npm run typecheck --prefix data-integration | Correcto en Windows y WSL |
| npm test --prefix data-integration | 45 pruebas correctas en Windows y WSL, incluido SSRF |
| npm run lint --prefix frontend | Correcto en Windows y WSL |
| npm test --prefix frontend | 37 pruebas correctas en Windows y WSL |
| npm run build --prefix frontend | Correcto en Windows y WSL |
| backend/src/mvnw.cmd -B -ntp test con JAVA_HOME JDK 21 | 36 pruebas correctas; BUILD SUCCESS |
| node frontend/tests/browser-smoke.mjs | 56 comprobaciones correctas |
| node frontend/tests/accessibility-smoke.mjs | Correcto tras corregir selector obsoleto |
| node frontend/tests/programs-filters-smoke.mjs | Correcto: filtros, URL, paginación y cuatro tamaños |
| node frontend/tests/account-sync-smoke.mjs | Correcto: persistencia por cuenta, reintentos y aislamiento |
| GET / a través de localhost:3005 | 200 |
| GET /api/programs a través de localhost:3005 | 200, catálogo real |
| GET /api/institutions a través de localhost:3005 | 200, catálogo real |
| GET /api/me/preferences sin autenticación a través de localhost:3005 | 401 del backend |
| Ctrl+C en WSL | 3005, 3001 y 8080 liberados; doctor vuelve a pasar |
| npm run dev:db:stop en WSL | Detiene PostgreSQL y conserva datos |
| git diff --check | Correcto |

Para probar PostgreSQL nuevo sin alterar la base anterior se usó una copia en
/tmp/eduplan-dx-validation, con nombres de proyecto, contenedor y volumen Docker
eduplan-dx-qa. Se mantuvieron los puertos y el código de arranque; únicamente se
ajustaron esos identificadores para aislar recursos. Tras verificar el flujo,
se eliminaron exclusivamente los recursos de prueba. El volumen y contenedor
originales se conservaron, detenidos como estaban inicialmente. La instancia
nativa Windows usada como base externa también se detuvo al finalizar.
Los smoke de navegador utilizaron Playwright ya disponible mediante
EDUPLAN_PLAYWRIGHT_PATH; no se añadió esa dependencia a la aplicación.

## Requisitos y problemas del equipo

Windows tiene Java 8 en PATH y no tiene Docker CLI. Para el flujo estándar debe
configurarse JDK 21+ y Docker Desktop, o ejecutarse en WSL con ambos disponibles.
No se instala software ni se cambian grupos o permisos desde el proyecto.

El volumen Docker anterior usa una contraseña distinta de wsl-database.json.
El nuevo arranque detecta esa diferencia antes de iniciar servicios y preserva
la base. Las credenciales manuales antiguas son válidas para ese volumen, pero
no cumplen el formato de las nuevas contraseñas locales generadas. Para seguir
usando esa base, configúrala explícitamente como base externa con DB_*; no se
rotaron sus credenciales ni se borraron sus datos durante esta tarea.

Los checks de GitHub Actions se revisaron y sus comandos equivalentes se
validaron localmente. No se ejecutó un workflow remoto ni se hizo push.
