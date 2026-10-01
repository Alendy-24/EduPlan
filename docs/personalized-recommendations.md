# Recomendaciones personalizadas V1

Documento histórico del motor original. El comportamiento vigente, su diagnóstico y validación están en [Matching V2](matching-v2.md).

## Arquitectura y privacidad

Spring persiste preferencias en `estudiante`, reutilizando su relación única `id_cuenta`. `GET/PUT /api/me/preferences` toma la identidad exclusivamente del JWT y comprueba cuenta existente/activa. La migración V7 añade únicamente `nivel_buscado` y `movilidad`; reutiliza `modalidad_preferida`, `municipio` y `departamento`. Conserva presupuesto, nombre, apellido y grado existentes. En esta pantalla, municipio/departamento expresan la ubicación preferida, no una ubicación inferida.

React recupera preferencias e intereses desde Spring. Su proveedor se desmonta al cambiar cuenta/token y cancela consultas pendientes. La completitud mide seis secciones: áreas, motivaciones, nivel, modalidad, movilidad y ubicación compatible con dicha movilidad. No es un match. Nivel y al menos un área bastan para calcular, salvo ubicación requerida por CITY/DEPARTMENT. Las preferencias sin guardar no se usan.

Express calcula junto al catálogo: `POST /api/recommendations`. Es un cálculo público y **sin estado**, no un endpoint de perfil privado: acepta preferencias explícitas, no recibe identidad/JWT ni persiste perfiles/resultados. La ruta React `/recomendaciones` requiere sesión. No se confía en un ID de usuario enviado por cliente. El perfil privado sigue protegido en Spring.

El navegador recibe top20 (dashboard3), máximo50. `sourceIds` permite calcular hasta3 registros exactos para ficha/comparador. Se comparte el catálogo completo del buscador en memoria durante5 minutos y una promesa concurrente; se consulta por bloques10.000 con límite100.000, comprobando identidades repetidas. Una caída de la fuente produce error/reintento, no fixtures. El primer cálculo puede ser más lento; no hay caché de perfiles de usuarios. `EDUPLAN_CATALOG_URL` permite probar otra instancia del catálogo con Vite sin cerrar procesos ajenos; por defecto3001.

## Elegibilidad y restricciones

Centralizadas en `data-integration/src/services/recommendations.ts`:

- Estado Activo; institución con código numérico y nombre utilizable.
- Nombre académico resuelto SNIES, sin `reviewRequired`. No se usa `rawName` ni título otorgado como sustituto.
- Nivel y NBC utilizables; identidad `upr9-nkiz:<fila>` y código del registro que permiten abrir exactamente su ficha. Un SNIES ambiguo no invalida una fila cuya identidad de catálogo y nombre sí están resueltos.
- Nivel buscado: filtro fuerte.
- CITY: municipio exacto normalizado (Bogotá / Bogotá D.C. equivalentes). DEPARTMENT: departamento exacto normalizado.
- ANY/RELOCATE/sin movilidad: no favorecen ninguna ciudad.
- Modalidad: señal suave. La UI la llama preferida, no obligatoria.

El NBC se exige para evitar presentar ausencia de información académica como 0% compatible. Un NBC conocido pero sin correspondencia editorial sí puede no coincidir; se informa como criterio no coincidente. El catálogo original, buscador, guardados y comparador no eliminan registros por estas reglas.

## Puntuación y explicaciones

Configuración versionada `nbc-v1` en `data-integration/src/config/recommendations.ts`: intereses50, modalidad20, ubicación20. No se añade el10% de otras señales porque no hay una señal defendible adicional. Se normalizan solo pesos aplicables:

`round(100 * puntos_coincidentes / suma_pesos_aplicables)`

Un NBC relacionado con al menos una de las áreas elegidas obtiene50, independientemente del número de áreas. Si hay modalidad preferida, se suman20 al denominador y se ganan solo cuando coincide exactamente. CITY/DEPARTMENT añaden20 al denominador y al numerador después de superar la restricción. Nivel no suma puntos. Ejemplo: interés y ciudad coinciden pero modalidad no, `70/90 = 78%`; ANY con modalidad no coincidente, `50/70 = 71%`. Sin modalidad/ubicación restringida, un único interés coincidente puede producir100%; no es certeza vocacional.

Normalización: tildes, mayúsculas, puntuación y espacios. Mapeo explícito a etiquetas NBC observadas en MEN; no se infiere por texto del nombre, título o prestigio. Las áreas amplias se exponen separadas, no se puntúan. Las motivaciones siguen visibles/persistentes pero no afectan V1. Tampoco costos/presupuesto, salario, empleo, admisión, notas, personalidad, comportamiento o rankings. No hay IA ni metodología psicológica.

Cada resultado incluye programa/institución, score, razones fijas, criterios coincidentes/no coincidentes, datos faltantes y procedencia/versionado. Se ordena por score descendente y `sourceId` como desempate estable; se deduplican identidades de fuente. Contextos idénticos con filas distintas siguen medidos como potenciales duplicados, no se fusionan automáticamente sin identidad SNIES concluyente.

## Frontend y enlaces

Perfil: nueva sección Preferencias académicas; conserva intereses, motivaciones, avatar y configuración. Resultados enlaza a recomendaciones. Dashboard muestra3 ofertas. Ficha/comparador muestran afinidad cuando calculable, nunca 0% para un perfil incompleto o registro excluido. Cards reutilizan guardar/comparar/ver ficha. Se mantiene máximo3 en comparador y costos no disponibles.

Ficha/comparador consultan `/api/program-links/batch`. Solo VERIFIED con URL pública válida y fecha válida muestra “Visitar página oficial del programa”. PENDING/NOT_FOUND/UNAVAILABLE/error tienen mensajes y reintento. La web institucional de la ficha sigue separada como fallback y no se presenta como página del programa. No se inventa una URL, ni se reemplaza el nombre académico SNIES por el título otorgado.

“No me interesa” excluye filas, con límite200 en localStorage por cuenta. Puede restaurarse. Solo se guarda en este dispositivo, no es entrenamiento ni altera pesos. El perfil y guardados siguen persistidos en servidor. Clasificación avanzada de guardados y recomendación de instituciones son evoluciones pendientes.

## Nuevos datos y calidad

Se incorporan `nombreareaconocimiento` → `broadKnowledgeArea` y `cantidadcreditos` → `credits`, separados de NBC. Se muestran en ficha sin inferir costos ni usar créditos para puntuar. Acreditaciones/vigencia se dejan pendientes: no se ha validado semántica ni vigencia suficiente para ofrecer un sello fiable.

Reporte reproducible: `npm run catalog-quality --prefix data-integration` (requiere acceso a MEN). Mide nombres resueltos/revisión/estado/nombres ausentes/identidades repetidas/contextos repetidos/NBC/nivel/modalidad/ubicación/SNIES/elegibilidad. Es una fotografía técnica, no un ranking.

Medición real del 30-09-2026: 27.005 filas, nombres SNIES 24.364 (90,22%), revisión/nombres no disponibles 2.641 (9,78%), activas 14.644, inactivas 12.357, NBC 25.651 (94,99%), nivel/modalidad/ubicación 27.001 (99,99%), SNIES 17.280 (63,99%), identidades repetidas 0, contextos potencialmente repetidos 1.531. Elegibles V1: 11.963 (44,30%). Reejecutar para cifras actuales; cambian con las reglas y la fuente.

## Verificación

- Frontend: `npm test --prefix frontend`, `npm run lint --prefix frontend`, `npm run build --prefix frontend`.
- Catálogo: `npm run typecheck --prefix data-integration`, `npm test --prefix data-integration`, `npm run build --prefix data-integration`.
- Spring: Java21+, JWT_SECRET de prueba; en backend/src, `./mvnw -B -ntp verify` (Windows `mvnw.cmd`). Tests PostgreSQL embebido crean bases nuevas aisladas. No usar credenciales productivas.
- UI/regresiones: `frontend/tests/browser-smoke.mjs` usa fixtures explícitos solo para pruebas; `program-links-smoke.mjs` cubre estados verificados/fallback/error. Requieren Playwright y Edge.
- Recorrido real: `frontend/tests/recommendations-live-smoke.mjs`; servicios locales levantados y MEN disponible, crea cuentas QA `@example.test`, verifica persistencia, otro dispositivo, aislamiento, guardar/comparar/ficha y25 combinaciones ruta/ancho375/390/430/768/1366. No usar contra producción. `EDUPLAN_TEST_URL`, `EDUPLAN_PLAYWRIGHT_PATH` y `EDUPLAN_BROWSER_CHANNEL` permiten configurar entorno.
- CI conserva verificación backend/catálogo y añade tests/lint/build frontend. Instala cada proyecto con `--workspaces=false` para funcionar tanto con la configuración raíz anterior como con workspaces locales pendientes.

### Resultado local del 30-09-2026

Frontend: 36/36 tests, lint y build Vite correctos. Data-integration: 45/45 tests, typecheck y build TypeScript correctos. Backend: `verify` correcto, 35/35 tests y JAR generado (Java 25 local compilando release 21; CI usa Java 21). PostgreSQL embebido aplica las siete migraciones en bases aisladas.

Chrome: recorrido real completo correcto, top20/dashboard3, persistencia tras login y en otro contexto de navegador, aislamiento de otra cuenta, guardar/comparar/ficha, feedback local restaurable y 25 comprobaciones sin desbordamiento horizontal a los cinco anchos indicados. Regresión general con Edge: 56 combinaciones ruta/ancho correctas. Prueba específica de enlaces con Edge: VERIFIED/PENDING/NOT_FOUND/UNAVAILABLE/error/reintento/fallback correctos. Los fixtures se usan únicamente para esa prueba y la regresión controlada, nunca como datos de la aplicación.

Consulta real de enlaces: HTTP 200 para 20 candidatos de Tecnología/Pregrado/Bogotá, todos NOT_FOUND en la base local. No hay enlaces verificados en esa muestra; no representa una medición global de cobertura. No se inventaron ni poblaron enlaces para demostrar la UI. La recopilación/revisión existente deberá ejecutarse por separado para ampliar la cobertura.

Los seis archivos de trabajo previos (`README.md`, los dos manifests raíz, los dos scripts PowerShell de desarrollo y `scripts/dev-backend.mjs`) se conservan fuera de los commits de esta función. Los tests de navegador crean cuentas QA únicamente en la base local de desarrollo.

## Limitaciones / pendientes

Taxonomía editorial revisable, no orientación validada. Seleccionar varias áreas amplía posibilidades, no garantiza diversidad del ranking. Cobertura NBC/SNIES incompleta y caché temporal; estado activo no confirma inscripción vigente. Empates frecuentes y100% con pocas señales son esperables. Geografía en texto normalizado puede necesitar un selector oficial para evitar errores. Sin costos fiables, acreditación vigente, perfil profesional detallado o empleabilidad no se infieren esas dimensiones. No hay feedback sincronizado ni agrupación por institución todavía. Antes de publicar ampliamente, revisar mapa editorial, carga/concurrencia del endpoint sin estado y política de actualización del catálogo.
