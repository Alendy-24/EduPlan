# Matching V2 · EduPlan

Versión `matching-v2.0`, implementada y auditada el 30 de septiembre de 2026. Sustituye el cálculo de [V1](personalized-recommendations.md); conserva la interfaz de [perfilamiento](profile-redesign.md).

## Diagnóstico reproducible de V1

V1 usaba tres señales binarias: intereses generales → NBC (50 puntos), modalidad (20) y ubicación (20). Nivel académico era un filtro duro, sin puntos. Tipo de formación, área amplia, motivaciones, duración y sector no contribuían.

El denominador incluía solo pesos aplicables. Sin modalidad ni ciudad/departamento, un interés relacionado obtenía `50 / 50 × 100 = 100`. Con ciudad y modalidad: `(50 + 20 + 20) / 90 × 100 = 100`. La restricción de ciudad eliminaba a los no coincidentes antes de puntuar; todos los supervivientes ganaban sus 20 puntos automáticamente. ANY/RELOCATE omitían esos puntos del denominador, aumentando la proporción de las otras señales.

Varios intereses funcionaban como OR: bastaba pertenecer a cualquier NBC relacionado para ganar los 50 puntos completos. Tecnología + Negocios + Artes incluían Sistemas, Telecomunicaciones, Industrial, Administración, Contaduría y Diseño. Compartían modalidad/ciudad y terminaban todos en 100, aunque sus disciplinas fueran diferentes.

`recommendations-v1-regression.test.mjs` ejecuta una copia del motor compilado original dentro de **fixtures de tests**, con seis NBC distintos, y reproduce seis 100. Las fixtures históricas no están conectadas a rutas de producción ni son respuestas de respaldo.

## Configuración única y procedencia

`data-integration/src/config/matching-v2.json` es la única fuente de pesos, umbrales, NBC, relaciones, actividades, contextos, familias de formación, unidades de duración y prioridades. React la importa; TypeScript la copia a `dist`; Maven la incluye como recurso en el JAR. Cambiar la configuración requiere revisar tests, incrementar la versión y reconstruir los tres consumidores.

La inspección real agrupó `nombrenivelacademico`, `nombrenivelformacion`, `nombreareaconocimiento`, `nombrenbc` y `nombreperiodicidad` del [catálogo MEN de programas](https://www.datos.gov.co/d/upr9-nkiz). La captura independiente de estos grupos está en `data-integration/tests/fixtures/catalog-observed-2026-09-30.json`; los tests la comparan con la configuración. La taxonomía contiene 55 etiquetas NBC observadas, conserva los nombres oficiales y excluye “Sin clasificar” de las opciones. No utiliza nombres de títulos como sustitutos de NBC.

La cadena es interés general → áreas amplias oficiales → NBC. Se normalizan tildes, case, puntuación y espacios para comparar; las etiquetas originales continúan en las cards. Las relaciones de actividades/contextos y entre NBC son **editoriales**, con fuerza y razón explícitas. Su fundamentación es temática; no han sido calibradas con resultados longitudinales ni constituyen validación psicológica. Ocho pares relacionados funcionan simétricamente. Una relación no configurada vale cero; no hay asociación inferida por IA ni por palabras en el nombre de una carrera.

## Nivel académico y tipo de formación

Se conservaron todas las combinaciones publicadas, incluidos sus conteos observados:

| Nivel académico | Valor original de formación | Registros | Familia seleccionable |
| --- | --- | ---: | --- |
| Pregrado | Formación técnica profesional | 2.214 | Técnico profesional |
| Pregrado | Tecnológica | 5.042 | Tecnológico |
| Pregrado | Universitaria | 7.788 | Universitario |
| Posgrado | Especialización técnico profesional | 65 | Especialización |
| Posgrado | Especialización médico quirúrgica | 587 | Especialización |
| Posgrado | Especialización tecnológica | 551 | Especialización |
| Posgrado | Especialización universitaria | 7.632 | Especialización |
| Posgrado | Maestría | 2.687 | Maestría |
| Posgrado | Doctorado | 434 | Doctorado |
| Pregrado | Especialización tecnológica | 1 | Anomalía conservada; no seleccionable |

Cuatro registros no publicaban la pareja completa. La anomalía no se “corrige” cambiando su nivel original, ni se ofrece una especialización como opción de pregrado. Está marcada `selectable:false` y documentada en la configuración. Los cuatro subtipos de especialización de posgrado se agrupan para filtrar, conservando el valor original de cada programa. Sin preferencia de familia, los filtros existentes siguen disponibles.

La UI tiene “Nivel académico” y un “Tipo de formación” dependiente. Ambos permiten “No estoy seguro”; cambiar nivel limpia el tipo incompatible. La familia elegida es un filtro duro. La API rechaza parejas inválidas, incluido Pregrado + SPECIALIZATION.

## Preguntas y reutilización de respuestas

Perfil académico conserva los datos básicos, siete intereses generales y seis motivaciones. Orientación añade ocho bloques:

1. NBC específicos: hasta ocho etiquetas oficiales, inicialmente relacionados con las áreas generales, con acceso al catálogo completo.
2. Actividades: hasta ocho; se reutilizan las motivaciones básicas sin volver a preguntar las mismas etiquetas. Una motivación repetida como actividad cuenta una sola vez.
3. Contextos: personas, datos, tecnología, ideas y creación, negocios; pueden elegirse varios.
4. Importancia de ubicación: indispensable, muy importante, preferible, indiferente. Solo aplica si hay ciudad/departamento preferidos.
5. Importancia de modalidad: exigir, preferir, indiferente. Solo aplica si hay modalidad elegida.
6. Duración: hasta dos años, más de dos hasta cuatro, más de cuatro; sin preferencia por defecto.
7. Sector: público, privado, sin preferencia.
8. NBC explícitamente no deseados, o revisión sin exclusiones.

La pantalla comunica que no hay respuestas correctas, no es un examen ni diagnóstico y las respuestas pueden cambiarse. El cuestionario futuro de aptitudes sigue separado y no fue implementado.

El progreso básico mide las seis secciones preexistentes. La afinación cuenta entre seis y ocho preguntas aplicables; prioridades no aplicables no entran en el denominador. Las opciones vacías/sin preferencia no añaden señales al progreso. Confirmar ausencia de exclusiones cuenta como revisión, pero no concede puntos. Ninguno de estos progresos es compatibilidad académica ni un umbral para desbloquear programas.

## Pesos y cálculo

| Criterio | Puntos máximos |
| --- | ---: |
| Afinidad académica / NBC | 40 |
| Actividades, motivaciones y contexto | 20 |
| Modalidad | 12 |
| Ubicación | 12 |
| Tipo de formación | 8 |
| Duración | 4 |
| Sector institucional | 4 |
| Total | **100** |

`earned = Σ(peso × coincidencia)`. El denominador es **siempre 100**. Una preferencia no respondida, indiferente o un dato ausente no gana puntos ni redistribuye su peso. Esto representa puntos sustentados por señales explícitas, no una probabilidad de éxito ni una confianza estadística. Se muestran puntos enteros ganados mediante truncamiento uniforme; el ranking usa la suma completa sin truncar. Por ejemplo, 99,6 puntos parciales se muestran como 99, mientras que siete coincidencias completas pueden alcanzar 100; no existe cap de 99.

Las prioridades de ubicación “indispensable” y “muy importante” conservan 12 puntos; “preferible” reduce su peso a 7,8 (`12 × 0,65`), sin repartir los 4,2 puntos restantes. “Indiferente” elimina el criterio. Los máximos efectivos dependen de las señales elegidas y pueden ser menores a 100. Es intencional y se muestra el peso efectivo en el desglose. El umbral de evidencia usa ese mismo peso efectivo conocido.

### Coincidencias graduales

- **NBC específico:** exacto 1; relación explícita más fuerte disponible (por ejemplo Sistemas ↔ Electrónica/Telecomunicaciones 0,78); misma área amplia oficial 0,45; sin relación 0. Si hay varios NBC deseados se usa el mayor match: son opciones aceptadas, no requisitos simultáneos.
- **Solo interés general:** NBC relacionado 0,60; misma área amplia 0,30; sin relación 0. Múltiples áreas siguen OR con esta fuerza parcial. Cuando hay NBC específicos, estos reemplazan la señal amplia, impidiendo que una categoría general anule la precisión elegida.
- **Actividades/motivaciones:** promedio de todas las respuestas seleccionadas y deduplicadas. No se toma únicamente la más conveniente. Si hay actividades y contextos, contribuyen 80/20 dentro del criterio de 20 puntos; si solo hay uno, usa ese grupo. Las actividades pesan menos que la afinidad específica.
- **Modalidad:** exacta 1, combinación Presencial/Virtual con modalidad híbrida 0,65, diferente 0. Exigir la modalidad produce filtro duro; preferirla permite otras; indiferente omite puntos.
- **Ubicación:** ciudad exacta o departamento elegido 1, otra ciudad del mismo departamento 0,65, ubicación distinta aceptada 0,20. Indispensable excluye los que no cumplan CITY/DEPARTMENT. ANY/RELOCATE no inventan una preferencia por Bogotá y omiten el criterio.
- **Formación:** familia elegida compatible y publicada 1. La familia actúa también como filtro, y aporta hasta ocho puntos; nivel académico es filtro sin puntos propios.
- **Duración:** rango exacto 1; proximidad al límite del rango disminuye linealmente en una tolerancia de 24 meses hasta cero. El límite inferior exclusivo usa el siguiente mes entero: 48 meses no es una coincidencia completa con “más de cuatro años”. Solo convierte conteos enteros positivos y unidades no ambiguas, con límite de diez años para evitar valores aberrantes.
- **Sector:** público/Oficial o privado/Privado exactos 1; sector diferente 0. Es una preferencia suave, no evaluación de calidad o costo.

Duración usa Semestral=6 meses, Anual=12, Mensual=1, Trimestral=3, Cuatrimestral=4 y Bimestral=2. “Bimensual”, “Periodos”, “Sin definir”, “Por cohorte”, valores vacíos y conteos no válidos permanecen desconocidos. No se inventa duración para conseguir puntos. El sector se une por código con el [catálogo MEN de instituciones](https://www.datos.gov.co/d/n5yy-8nav); una caída de ese catálogo deja el sector desconocido y mantiene los programas disponibles.

### Evidencia para mostrar un número

Se exige simultáneamente:

1. Al menos un NBC específico.
2. Al menos una actividad/motivación o contexto válido.
3. Al menos cuatro criterios respondidos con datos conocidos del programa.
4. Al menos 72 puntos de peso conocido, independientemente de que coincidan.

En caso contrario aparece **Coincidencia preliminar**, sin porcentaje global. El resultado aún se ordena usando los puntos internos. No se presupone que responder muchas preguntas produzca un match alto; evidencia y coincidencia son distintas. Un dato ausente puede volver preliminar un resultado concreto aunque otros del mismo perfil tengan número.

Cada respuesta incluye los siete criterios con peso efectivo, match, estado `NOT_ANSWERED`/`MISSING`/`MATCH`/`PARTIAL`/`NO_MATCH` y motivo. Las razones nombran NBC, actividades o datos publicados que realmente contribuyeron. Coincidencias completas se cuentan separadamente de parciales. Desempate: puntos sin truncar, afinidad NBC, menos datos faltantes, nombre académico y sourceId. Una carrera puede empatar con otra que comparte NBC y metadatos: no se inventan subdisciplinas para separarlas.

## Persistencia, compatibilidad y aislamiento

Flyway V8 añade `estudiante.tipo_formacion` y `account_matching_preferences`. Esta última tiene clave primaria/FK `id_cuenta`, JSONB, versión de taxonomía, actualización y borrado en cascada. Conserva datos existentes de cuenta, presupuesto, nombre, grado y preferencias.

`GET/PUT /api/me/matching-preferences` exige JWT y cuenta activa. La identidad procede del JWT, nunca de query/body. Las listas son acotadas; se canonicalizan alias de tildes/case/espacios, y se rechazan desconocidos, duplicados y NBC a la vez deseados/excluidos. Sin fila retorna preferencias vacías. `educationLevel` es opcional para clientes antiguos y se normaliza a vacío.

React recupera perfil, intereses y afinación de Spring; desmonta el proveedor al cambiar cuenta/token y cancela solicitudes. Solo respuestas guardadas alimentan el recomendador. Una escritura fallida conserva el formulario y permite reintentar; una nueva sesión/contexto recupera los datos del backend. No se añadieron respuestas centrales al localStorage.

El endpoint Express permanece público, explícito y sin estado: calcula el perfil enviado; no identifica cuentas, no almacena perfiles ni cachea resultados privados. Reutiliza las cachés acotadas de catálogos. Las APIs de guardados, exclusiones por sourceId, comparación y ficha mantienen su comportamiento.

## Antes y después

Comparación controlada: seis programas con igual ciudad, modalidad y formación; V1 con Tecnología/Negocios/Artes. V2 refina Sistemas, Resolver problemas/Desarrollar tecnología/Analizar datos y contexto Datos. Usa ciudad importante, modalidad preferida y formación universitaria, sin duración/sector.

| NBC del candidato | V1 | V2 |
| --- | ---: | ---: |
| Sistemas / Telemática | 100 | 92 |
| Electrónica / Telecomunicaciones | 100 | 68 |
| Industrial | 100 | 54 |
| Administración | 100 | 32 |
| Contaduría pública | 100 | 39 |
| Diseño | 100 | 32 |

Los números son casos de prueba controlados, no observaciones sobre todas las ofertas del catálogo. Los tests A/B/C verifican predominio de sus NBC, D expansión del universo al quitar ciudad obligatoria y E resultado preliminar sin precisión falsa. También se prueba un 100 excepcional auténtico y un 99,6 parcial que no redondea a 100.

La validación adicional con el catálogo real y cuentas desechables produjo:

| Perfil | Ofertas elegibles | Puntuaciones internas en top20 | Presentación |
| --- | ---: | --- | --- |
| A · Sistemas, datos y tecnología; Bogotá / presencial / universitario | 1.011 | 92 | Numérica; primeros NBC de Sistemas |
| B · Negocios, liderazgo, negociación y números | 1.011 | 89 | Numérica; primeros NBC de Administración |
| C · Salud, ayuda, investigación y personas | 1.011 | 86 y 84 | Numérica; primeros NBC de Medicina/Enfermería |
| D · Perfil A permitiendo cualquier ciudad | 3.734 | 80 | Numérica; cambian universo y primeras ofertas |
| E · Solo Tecnología, sin nivel/modalidad/ubicación | 11.963 | 24 | **Coincidencia preliminar**, número oculto |

Estos conteos son la observación de esta ejecución; cambian con el MEN. La reducción A→D en puntos se debe a retirar la preferencia por una ciudad, sin redistribuir sus doce puntos. En C se respeta el NBC publicado aun cuando un nombre de programa parezca pertenecer a otra área. En A/B/D hay empates reales: metadatos iguales dentro del mismo NBC no distinguen contenido curricular.

## Validación y límites

`npm run test --workspace frontend`, `npm run lint --workspace frontend`, `npm run build --workspace frontend`, `npm run test --workspace data-integration`, `npm run typecheck --workspace data-integration` y Maven `verify` validan contratos, motor, migraciones, persistencia y aislamiento. En este entorno, Maven usa Java 21 en WSL porque PostgreSQL embebido de los tests no tiene binario Windows. No altera la configuración normal de desarrollo.

Resultado final: 47 tests frontend, 65 data-integration y 38 backend, sin fallos. Lint, typecheck, ambos builds y `verify` correctos. Las regresiones de navegador de guardados, ficha, comparación y segundo dispositivo también pasan.

`frontend/tests/matching-v2-live-smoke.mjs` usa Spring/PostgreSQL y MEN reales con cuentas desechables: A–E, reinicio de formación al cambiar nivel, escritura fallida/reintento, sesión en segundo contexto, aislamiento, exclusiones NBC, sector/duración y doce vistas en seis anchos. Guarda resumen y capturas en `.tools/qa/matching-v2/`, fuera de Git. Las fixtures de UI siguen verificando las cuatro pestañas y 24 vistas del rediseño.

Pendientes de evolución: calibrar relaciones editoriales con asesoría académica y validación de usuarios; ampliar pares NBC solo con justificación; revisar anomalías/nuevas etiquetas cuando cambie el MEN; implementar posteriormente un instrumento vocacional separado. El catálogo agrupa programas por NBC: no permite distinguir contenido curricular entre carreras del mismo NBC con metadatos iguales. Las dependencias externas pueden requerir reintento. No se añadieron costos, salarios, admisión, prestigio, notas, Saber 11 ni aptitudes medidas.
