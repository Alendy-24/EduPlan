# Cómo ejecutar EduPlan con el asistente virtual

Guía para levantar el proyecto en un computador nuevo (Windows / PowerShell) con el chatbot funcionando.

## Requisitos

- Git
- Java 21 o superior
- Node.js `^20.19` o `>=22.12`
- PostgreSQL con una base de datos vacía llamada `eduplan_db`
- Una API key propia de Groq (se crea en <https://console.groq.com/keys>)

> Cada persona debe crear su propia API key. Nunca subas keys, contraseñas ni tokens al repositorio.

## 1. Clonar el repositorio

```powershell
git clone https://github.com/Alendy-24/EduPlan
cd EduPlan
git checkout <rama-del-asistente>
```

## 2. Terminal 1: backend (Spring Boot)

```powershell
cd backend\src
$env:DB_URL = 'jdbc:postgresql://localhost:5432/eduplan_db'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = '<TU_CLAVE_DE_POSTGRES>'
$env:DATA_SYNC_ADMIN_TOKEN = '<TOKEN_ADMIN_GENERADO>'
$env:JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:GROQ_API_KEY = '<TU_API_KEY_DE_GROQ>'
.\mvnw.cmd spring-boot:run
```

Notas:

- `DATA_SYNC_ADMIN_TOKEN` se puede generar con `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.
- `JWT_SECRET` se genera nuevo en cada arranque con el comando de arriba. Si cambia, hay que volver a iniciar sesión en la app.
- Las tablas se crean solas al arrancar (Flyway).

## 3. Terminal 2: catálogo (data-integration)

```powershell
cd data-integration
npm install
$env:PORT = '3001'
npm run dev
```

El puerto `3001` debe coincidir con el proxy de `frontend/vite.config.js`. Para comprobar que responde: <http://127.0.0.1:3001/health>.

## 4. Terminal 3: frontend

```powershell
cd frontend
npm install
npm run dev
```

La app queda en <http://localhost:3005>.

## 5. Probar el asistente

1. Regístrate o inicia sesión (el asistente solo funciona con sesión iniciada).
2. Abre la burbuja de chat.
3. Pregunta algo, por ejemplo: "¿Cómo comparo dos programas?".

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Could not resolve placeholder 'JWT_SECRET'` (u otra variable) | La variable no está definida en esa terminal | Definirla antes de ejecutar `mvnw` |
| `Could not resolve placeholder 'assistant.*'` | Faltan las líneas del asistente en `application.properties` | Agregar `assistant.base-url`, `assistant.api-key` y `assistant.model` |
| 404 en `/api/assistant/chat` | Falta `/api/assistant` en el proxy de Vite | Agregarlo en `frontend/vite.config.js` y reiniciar el frontend |
| 502 en `/api/institutions` | `data-integration` no está corriendo | Ejecutar la Terminal 2 con `PORT = 3001` |
| "El asistente no está disponible" | Error de Groq (key, modelo o límite) | Revisar la consola del backend |
| 401 en el chat | Sesión vencida o no iniciada | Volver a iniciar sesión |

## Configuración del asistente

En `backend/src/main/resources/application.properties`:

```properties
assistant.base-url=https://api.groq.com/openai/v1
assistant.api-key=${GROQ_API_KEY}
assistant.model=openai/gpt-oss-20b
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

Las tarjetas y el detalle de programas muestran fotografías reales de referencia
por disciplina, con selección consistente por nombre oficial, guardadas
localmente y sin otra API key. Consulta las
[fuentes y personalización por programa](docs/program-images.md).

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

La [verificación general de búsqueda](docs/search-quality.md) comprueba todos
los nombres del índice SNIES y variantes de escritura mediante
`npm run search-quality --prefix data-integration`.

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

### Matrícula en el comparador

El comparador muestra un gráfico de los montos reportados en el campo
`COSTO_MATRÍCULA_ESTUD_NUEVOS` de la descarga oficial de
[SNIES / HECAA](https://hecaa.mineducacion.gov.co/consultaspublicas/programas).
La API de programas expone `tuition` cuando hay una coincidencia única por
código SNIES, código institucional, modalidad y municipio. Los registros sin
precio o con valores contradictorios permanecen sin información.

El catálogo importado el 7 de octubre de 2026 contiene 12.745 registros con
precio de 32.041 filas de origen. La fecha de importación no es la vigencia del
precio. El archivo no especifica año del costo ni periodo de cobro: el gráfico
compara montos reportados para estudiantes nuevos, no costos semestrales
normalizados, y solicita confirmar esos datos con la institución. No utiliza
precios de demostración ni resúmenes guardados cuando falla la actualización.

Para actualizar, descarga “Descargar programas” en HECAA y ejecuta:

```sh
cd data-integration
python3 tools/import-snies-tuition.py /ruta/programas.xlsx --date YYYY-MM-DD
npm test
```

El importador guarda la URL, campo original, fecha de consulta y SHA-256 del
archivo en `data/snies-tuition.json`. No requiere llamadas externas al abrir el
comparador. Cada importación se publica junto con la aplicación.

Cada opción del gráfico permite abrir “Ver detalles y otros costos”, con
población a la que aplica el monto, vigencia, periodo de cobro, créditos del
programa y código SNIES. Se muestran enlaces directos a tarifas de UNAD,
Universidad Libre y Javeriana Bogotá cuando coincide el dominio institucional.
Otros dominios conservan su sitio institucional como punto de consulta.

Para UNAD se incorporaron tarifas oficiales de Colombia de 2026 (consultadas
el 7 de octubre de 2026): crédito regular según nivel, tarifa de ciertos créditos
disciplinares de pregrado, inscripción, seguro estudiantil y grado ordinario.
La selección por nivel es explícita y las tarifas no se aplican a programas de
otras instituciones ni a niveles no cubiertos. Estas tarifas están en
`frontend/src/utils/program-costs.js`; deben revisarse contra
https://estudios.unad.edu.co/costos al cambiar la vigencia. No se suman al monto
SNIES ni se multiplican por créditos del currículo para inventar un semestre o
un costo total. Los costos de vida y los descuentos personales siguen por confirmar.
