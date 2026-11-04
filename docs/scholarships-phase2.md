# Becas EduPlan · entrega de fase 2

Referencia editorial: **3 de noviembre de 2026, America/Bogota**. Este informe registra la implementación y sus verificaciones; la publicación en Git se realiza posteriormente por instrucción del propietario.

## Auditoría y decisiones

La fase anterior dejó 28 oportunidades en `frontend/src/data/scholarships.js`. El catálogo es editorial y local, con vigencia centralizada en `services/scholarships.js`; no había endpoint público de becas ni tabla de convocatorias. Los guardados usan `BookmarkButton`, `ExplorationContext` y las API autenticadas `/api/me/saved`, con resúmenes de texto compatibles con el backend. Se conservaron sus identificadores y enlaces.

`AcademicProfileContext` ya obtiene del servidor nivel académico, tipo de formación, modalidad, ciudad y departamento deseados, movilidad, intereses y afinación temática. Esos datos alimentan las recomendaciones académicas existentes. No contienen residencia acreditada, matrícula en una institución, notas, edad, ingresos ni nacionalidad. Tampoco hay una preferencia institucional explícita que pueda reutilizarse como matrícula. Guardar una universidad no prueba ningún vínculo con ella.

Se ejecutó el plan: ampliar evidencia y catálogo; registrar identidad visual; persistir respuestas opcionales dentro de la cuenta; implementar un motor único; conectarlo al catálogo y Mi espacio; verificar datos, autorización, navegación y diseño. El motor se calcula en el frontend sobre el catálogo existente y los datos privados ya cargados: no requiere otra base de convocatorias ni envía respuestas financieras a la API pública de recomendaciones académicas.

## Catálogo y fuentes

**28 → 37 oportunidades**, sin sustituir los 28 identificadores anteriores.

| Estado al 3/11/2026 | Total |
|---|---:|
| Abiertas verificadas | 7 |
| Próximas | 7 |
| Por calendario institucional | 13 |
| Cerradas | 7 |
| Por verificar | 3 |

Nuevas: apoyos socioeconómicos UNAL Bogotá; Beca Juan Pablo II UPB Bucaramanga; excelencia semestral UNAB; excelencia y desempeño integral UTB; sostenimiento regular SENA; Renta Joven; Beca Especial POLI 2027-1; becas socioeconómicas UManizales 2027-1; matrícula de honor Externado. La convocatoria de UManizales se incorpora cerrada, no como inscripción actual.

La [relación auditable](scholarships-sources.md) contiene fuentes oficiales, fechas, requisitos, clasificación financiera y límites de cada incorporación. No se interpretan calendarios de giros, resultados o renovación como aperturas para nuevos aspirantes. Se conserva la política previa de fechas: un anuncio no activa inscripciones automáticamente.

## Identidad visual

`ScholarshipBrand` resuelve las **29 entidades** del catálogo por hosts oficiales revisados, no por semejanza de nombres. Reutiliza las imágenes locales de Javeriana y UNAL, y añade un SVG oficial del emblema europeo para Erasmus con condiciones de uso de terceros documentadas. No se presentan esas imágenes como patrocinio de EduPlan.

En la ampliación visual posterior solicitada por el propietario se incorporaron 25 recursos adicionales: 28 de 29 entidades y 35 de 37 oportunidades tienen imagen local. MEXT conserva texto. Las marcas se identifican editorialmente, sin presentar afiliación ni una licencia libre inexistente; la documentación registra procedencias, derechos y créditos. [Procedencias, condiciones y limitaciones](scholarship-images.md).

Las tarjetas reservan espacio para la identidad, cargan imágenes de forma diferida y recuperan texto si fallan. «En el radar» muestra tres oportunidades abiertas ordenadas por cierre, tomadas del mismo catálogo; incluye tipo financiero y advertencia de devolución cuando corresponde. No hay carrusel ni copias independientes de datos.

## Preferencias de apoyo dentro de Mi perfil

Seis respuestas opcionales, con la opción de no responder:

| Campo | Uso efectivo |
|---|---|
| Etapa del programa a financiar | Ingreso frente a estudiante ya matriculado; también aplica a posgrados. |
| Apoyo principal | Matrícula, sostenimiento o movilidad según cobertura explícita. |
| Devolución | Excluye créditos y compromisos financieros si se prefieren apoyos sin devolución. |
| Interés en el exterior | Prioriza experiencias internacionales o respeta preferencia por Colombia. |
| Admisión | Detecta ausencia declarada cuando la fuente exige admisión; un «sí» no acredita la institución concreta. |
| Nacionalidad | Compara únicamente condiciones explícitas de colombianos/extranjeros. |

Se integran en «Apoyo para tus estudios», junto al perfil académico, sin repetir nivel, ciudad o modalidad. Se guardan mediante `GET/PUT /api/me/financing-preferences` y la migración Flyway V9, en una tabla asociada por FK a la misma cuenta. PUT exige el contrato exacto, admite respuestas vacías y rechaza campos, valores y tipos desconocidos. No se aceptan IDs de cuenta aportados por el cliente.

El JWT determina la cuenta. No se mantienen copias de estas preferencias en localStorage, URLs públicas ni perfiles paralelos. Cambiar de cuenta remonta el contexto. Un fallo al leer financiación tiene estado y reintento propios y no bloquea las recomendaciones académicas ni el catálogo público.

## Motor único de recomendaciones

`services/scholarship-recommendations.js` contiene las reglas puras; `useScholarshipRecommendations` usa el contexto de perfil ya cargado. Lo consumen tanto **«Para ti»** en Becas como **«Becas que podrían interesarte»** en Mi espacio. El orden predeterminado es el mismo; el catálogo permite además un orden explícito elegido por el estudiante.

No hay porcentajes ni explicaciones generativas. Se comparan criterios documentados: nivel y formación, lugar preferido de estudio, modalidad y área solo si la ficha publica esas restricciones, rubro de financiación, devolución, interés internacional, etapa, admisión y nacionalidad. Los cuatro rótulos son coincidencia con preferencias, posible interés, confirmación pendiente e incompatibilidad de requisito. Las diferencias de preferencias se distinguen de un rechazo por requisito oficial.

Una incompatibilidad confirmada, como nacionalidad distinta o falta declarada de admisión exigida, excluye la oportunidad de las sugerencias. Se conserva su evaluación en el catálogo general. Las preferencias incompatibles, como querer evitar créditos o buscar exclusivamente otra ciudad, también la apartan de «Para ti», sin afirmar que la entidad rechazó a la persona.

Las llamadas cerradas o sin vigencia confirmada no se recomiendan. Se ordenan las restantes por clasificación, vigencia, cantidad de criterios efectivamente coincidentes y cierre real en Bogotá. Esa comparación interna no es una probabilidad ni una puntuación de elegibilidad. La fecha civil sin hora dura todo el día; los cierres con hora usan el instante publicado.

Los requisitos no evaluados se referencian desde el mismo arreglo `requirements` con `manualRequirementIndexes`, evitando una segunda copia. Edad, Saber 11, promedio, idioma, experiencia, focalización o titulación siguen pendientes: el sistema no los adivina ni pide documentos. La residencia no se deriva del lugar deseado de estudio. Por esa razón, las oportunidades reales pueden quedar como «Requiere confirmar requisitos» aun teniendo varias coincidencias útiles. Completar las seis respuestas no elimina esas comprobaciones externas.

Mi espacio muestra hasta tres opciones, con cobertura, estado, fecha, explicación, guardado y detalle. Si solo hay una o dos opciones compatibles, muestra esas; no rellena con convocatorias cerradas o incompatibles. Si faltan respuestas, permite explorar opciones actuales y enlaza al perfil. Si no hay opciones compatibles, ofrece ajustar preferencias o abrir el catálogo público.

## Tres ejemplos concretos

Ejemplos evaluados con el catálogo y fecha de referencia; son perfiles ilustrativos, no datos de personas reales.

1. **Ingreso a pregrado en Bogotá, matrícula, sin créditos, con alguna admisión y nacionalidad colombiana.** Aparecen Bachiller Destacado de Javeriana, Beca Especial POLI y Jóvenes a la E privadas. Coinciden nivel, destino o rubro; quedan por confirmar admisión al programa concreto, condiciones académicas o socioeconómicas y, en Atenea, edad, colegio y Saber 11. Quiero Estudiar no se presenta como una convocatoria general abierta y los créditos se apartan por la preferencia de devolución.
2. **Estudiante de tecnología en Cali que necesita sostenimiento y prefiere apoyos sin crédito.** SENA sostenimiento regular y Renta Joven pueden interesarle por etapa, formación y rubro. Debe confirmar pertenencia a una formación habilitada, focalización y los demás requisitos. Preferir Cali no acredita residencia ni garantiza oferta. Univalle no se promueve como inscripción actual porque el plazo publicado venció. La interfaz conserva solo las opciones encontradas, aunque sean menos de tres.
3. **Ingreso a una maestría en el exterior, buscando matrícula y dispuesto a considerar devolución.** COLFUTURO, DAAD EPOS y Erasmus Mundus aparecen por nivel, destino y cobertura. COLFUTURO se identifica como crédito-beca próximo; quedan por confirmar título e idioma. DAAD exige experiencia y calendario del programa, y Erasmus depende del consorcio. El sistema no convierte interés académico en elegibilidad para una maestría concreta.

## Archivos principales

- Catálogo, contrato y reglas: `frontend/src/data/scholarships.js`, `scholarship.d.ts`, `services/scholarships.js`, `services/scholarship-recommendations.js`.
- Perfil compartido y API: `contexts/AcademicProfileContext.jsx`, `services/account.js`, `utils/financing.js`, `components/AcademicPreferencesForm.jsx`, `components/FinancingPreferencesForm.jsx`.
- Vistas: `pages/ScholarshipsPage.jsx`, `pages/DashboardPage.jsx`, `components/ScholarshipRecommendations.jsx`, `components/ScholarshipMatch.jsx`, `hooks/useScholarshipRecommendations.js`.
- Identidad: `data/scholarship-brands.js`, `components/ScholarshipBrand.jsx`, `public/logos/scholarships/eu-emblem.svg` y estilos de becas, identidad y personalización.
- Backend: `account/FinancingPreferences.java`, `FinancingPreferencesController.java`, `FinancingPreferencesService.java`, `V9__preferencias_financiacion.sql`, `FinancingPreferencesIntegrationTest.java`.
- Pruebas de catálogo, marcas, recomendaciones, cuenta, navegador y regresión; `frontend/tools/audit-scholarships.mjs`.

## Validación y pendientes

Resultados finales:

| Verificación | Resultado |
|---|---|
| Suite frontend (`npm test --prefix frontend`) | **109/109 correctas**, incluida la ampliación posterior de logos |
| Suite backend completa (`./mvnw test`) | **42/42 correctas**, sin omisiones |
| Lint frontend | 0 errores y advertencias |
| Compilación Vite | Correcta; advertencia de bundle indicada abajo |
| TypeScript del catálogo con JSDoc y `scholarship.d.ts` | Correcto |
| TypeScript de data-integration | Correcto |
| Auditoría del catálogo | 0 errores, 2 advertencias editoriales Icesi esperadas |
| `scholarship-personalization-browser.mjs` | Correcto: persistencia, cambio de preferencias, mismo orden en ambas vistas incluso al elegir orden predeterminado, separación de cuentas, ausencia de copia local, error aislado y sesión rechazada |
| `scholarships-browser.mjs` | Correcto: filtros, búsqueda, detalle, guardado y retiro, enlaces antiguos, cuatro tamaños |
| `accessibility-smoke.mjs` | Correcto: foco, teclado, controles y contraste comprobados por el script |
| `browser-smoke.mjs` | Correcto: **56 combinaciones de ruta/tamaño**, autenticación, programas, paginación, guardados, intereses y persistencia de tres opciones en el comparador |
| Identidad gráfica | 4/4 unitarias; 25 imágenes adicionales cargadas en navegador, entidad sin imagen y caída forzada con respaldo, sin errores JavaScript |
| Revisión visual | 1440, 1024, 768 y 390 px, catálogo público, perfil, Mi espacio, «Para ti» y detalle móvil sin desbordamientos |

Los tests de navegador usan fixtures explícitos de cuenta y no crean usuarios en la base de desarrollo; la persistencia y autorización reales se comprueban en PostgreSQL embebido aislado. La migración V9 también fue aplicada por el backend local al recargar las clases; el servicio volvió a iniciar correctamente.

Para poder completar la regresión se corrigieron dos problemas preexistentes del arnés de pruebas, sin cambiar las funciones comprobadas: `tuition-chart.test.mjs` ahora convierte URLs de archivos con `fileURLToPath` para admitir rutas con espacios, y `browser-smoke.mjs` verifica los tres artículos reales de `.comparison-options` en lugar de un selector eliminado. Sus comprobaciones de gráficos, cantidad y recarga se mantienen. El test de filtros espera el resultado renderizado además de la URL para evitar una lectura antes de que React termine de pintar.

Capturas finales en `.tools/qa/scholarships-phase2/`, ignoradas por Git; incluyen vistas públicas, fallos de imagen, detalle móvil y perfil/Mi espacio/Para ti autenticados. Logs de referencia: `.tools/qa/scholarship-phase2-unit.log` y `.tools/qa/financing-backend-full.log`.

Limitaciones: catálogo editorial con actualización manual, dos fichas Icesi de verificación parcial, requisitos oficiales que solo la entidad puede comprobar, fuentes que no responden igual a todos los clientes y marcas gráficas pendientes de permiso. Uninorte/SNIBCE/UPTC y los bloqueos HTTP de UTB/Externado están documentados en la relación de fuentes. No se implementó crawling, servicio pago ni un sistema paralelo de recomendación académica. Vite conserva advertencia por el tamaño del bundle; no se debilitó esa comprobación ni se cambió el comparador de producción para aprobar pruebas. No se ejecutó Sonar remoto ni se certifica un quality gate.
