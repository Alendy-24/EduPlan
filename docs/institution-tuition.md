# Tarifas institucionales

La API de programas incluye `tuition` con la tarifa institucional del año UTC
actual, con prioridad sobre SNIES, cuando existe una coincidencia exacta por código SNIES, institución,
modalidad y municipio. En otro caso conserva el monto SNIES disponible. No se
trasladan tarifas entre sedes, modalidades ni programas con nombres parecidos.
Los registros contradictorios no se seleccionan arbitrariamente.

El catálogo `data-integration/data/institution-tuition.json` guarda montos COP,
año, periodo de cobro, fecha de revisión, URL y condiciones. `sourcePage` permite
localizar el dato en PDF. `SEMESTER` significa matrícula de primer semestre;
`FIRST_ENROLLMENT` significa primer ingreso sin confirmar periodo de cobro.
`ACADEMIC_PERIOD` conserva el periodo académico declarado sin asumir que es un
semestre. `FREE_TRAINING` identifica la formación gratuita verificada del SENA;
solo admite cero, su código institucional y la fuente oficial autorizada.
No se multiplican precios por crédito ni se aplican descuentos automáticamente.
La comparación muestra las condiciones y permite abrir la fuente original.

## Cobertura inicial revisada el 14 de octubre de 2026

- Externado: 18 programas presenciales de Bogotá, tabla de admisiones 2026.
- El Bosque: 23 programas presenciales de Bogotá, Acuerdo 18522, primer semestre
  del plan vigente. Se excluyen medicina y tarifas de mallas antiguas ambiguas,
  y programas virtuales con periodos de nueve semanas.
- UNAB: Ingeniería Industrial de Bucaramanga, primer ingreso 2026, sin otros
  derechos pecuniarios, inglés ni competencias digitales.

Esta carga incorpora 42 tarifas: solo Matemáticas de El Bosque no tenía monto
en la importación SNIES actual; las demás añaden información vigente a ofertas
con montos previos. Matemáticas comparte título con otras ofertas y no se muestra
hasta resolver su identidad: 41 tarifas pueden asociarse automáticamente al
contexto académico del índice. La recolección automática descrita abajo puede
ampliar esta carga inicial; no implica cobertura completa.

## Actualización

Revisar las fuentes antes de cada periodo de admisión y al comienzo del año.
El catálogo no consulta páginas externas durante búsquedas de usuarios. Los
montos institucionales de otros años se dejan de usar automáticamente; SNIES
puede seguir mostrándose con vigencia por confirmar.

1. Consultar la página o PDF oficial y verificar año, primer ingreso, modalidad,
   municipio, cobros adicionales y posibles restricciones por plan de estudios.
2. Preparar un JSON con `schemaVersion: 1` y `records`, siguiendo el catálogo.
   Usar la fecha real de revisión. Nunca convertir falta de datos en cero.
3. Desde la raíz: `npm run tuition:import --workspace=data-integration -- /ruta/revisado.json`.
4. Revisar el diff del catálogo y ejecutar las pruebas. El importador valida el
   contexto contra el índice oficial, rechaza duplicados y revisiones anteriores,
   conserva las demás universidades y reemplaza el archivo de forma atómica.

El importador requiere revisión humana de la pertenencia de la fuente a la
institución: una URL educativa válida por sí sola no verifica un precio.
No hace falta una clave de API externa.

## Recolección automática

Los PDF requieren Python con las dependencias de
`data-integration/tools/tuition-requirements.txt`. Actions las instala al ejecutar
el workflow. Para una ejecución local aislada en macOS/Linux:

```bash
python3 -m venv .tools/tuition-python
.tools/tuition-python/bin/python -m pip install -r data-integration/tools/tuition-requirements.txt
```

El comando de tablas detecta ese entorno; también admite
`EDUPLAN_TUITION_PYTHON` con la ruta a otro intérprete preparado. En Windows puede
crearse la misma carpeta con `python -m venv .tools/tuition-python` y usar
`.tools/tuition-python/Scripts/python.exe` para instalar los requisitos.

Desde la raíz:

```bash
npm run tuition:refresh:snies --workspace=data-integration
npm run tuition:collect --workspace=data-integration
npm run tuition:collect:tables --workspace=data-integration
npm run tuition:coverage --workspace=data-integration
```

- SNIES: descubre el botón público de descarga, conserva la sesión JSF y procesa
  el XLSX completo con la biblioteca estándar de Python. Actualiza nombres y
  precios desde la misma exportación. Rechaza respuestas HTML, cambios de
  columnas y caídas superiores al 10% en filas, identidades o precios.
- UNAB: descubre URLs del sitemap oficial, verifica el SNIES publicado, su oferta
  única en el índice, modalidad, rótulo de primer ingreso, monto único y vigencia
  explícita del año actual. No toma montos de inglés, inscripción, créditos ni
  descuentos. Guarda el SHA-256 de la página y el texto de evidencia.
- Javeriana Cali: descubre las carreras en el listado oficial y consulta el
  bloque «Costo semestre» del año actual. Verifica código SNIES, código de la
  seccional, modalidad y pestaña COP; no usa el costo de inscripción ni USD.
- SENA: exige la declaración oficial universal de gratuidad y una publicación
  oficial del año actual que corrobore el acceso gratuito a la formación. Solo
  incorpora ofertas activas del código institucional 9110. No aplica esta regla
  a universidades públicas ni a becas o gratuidad sujeta a requisitos personales.
- UAO: descubre la resolución anual desde la guía oficial y extrae sus tablas
  de estudiantes nuevos. Conserva modalidad, periodo, carga de 10 a 18 créditos,
  jornada diurna, exclusión de ProCultura y página del PDF. Omite programas con
  tarifas nocturnas diferentes, cargas variables o identidad activa ambigua.
  No calcula precios multiplicando créditos. Los importes de ambos periodos
  deben ser iguales; si difieren quedan pendientes.
- Externado y El Bosque conservan su carga revisada; todavía no tienen extractores
  automáticos de sus tablas/PDF. Cada nueva universidad requiere un adaptador
  validado con su estructura real. No se aplica una extracción genérica por IA.

El recolector institucional consulta secuencialmente, con tiempo y tamaño
máximos; detiene un sitio tras cinco errores consecutivos. Las páginas bloqueadas
o ambiguas se registran como pendientes. No esquiva bloqueos del sitio.
Un monto nuevo que contradiga una tarifa del mismo contexto/año queda pendiente
de revisión, y se retira la tarifa institucional anterior de la selección
automática. La API puede conservar el monto SNIES con vigencia por confirmar.

Los artefactos locales quedan en `.tools/tuition/`, ignorados por Git:

- `programas.xlsx`: exportación oficial usada como evidencia.
- `institution-candidates.json`: tarifas explícitas extraídas.
- `collection-report.json`: URLs verificadas, pendientes, errores y conflictos.
- `coverage.json`: cobertura real sobre ofertas activas, por institución, y lista
  de faltantes para priorizar nuevas fuentes.

La cobertura distingue **monto oficial reportado** de **tarifa institucional del
año actual**. Nunca etiqueta un precio SNIES sin año como vigente. El denominador
incluye ofertas activas sin identidad resuelta; las ofertas con identidad se
deduplican por institución, SNIES, modalidad y municipio. No mide todos los
programas del país fuera del catálogo disponible para la aplicación.

El workflow `.github/workflows/tuition-refresh.yml` ejecuta esos pasos los lunes
a las 09:00 UTC, conserva auditorías durante 60 días y solo guarda datos en Git
después de pasar las pruebas. Requiere publicar el workflow en la rama principal
y permitir escritura al token de Actions; las reglas de protección de rama
pueden impedir el commit automático. También permite ejecución manual desde
Actions. No está activado únicamente por crear este archivo localmente.

## Resultado de la ejecución inicial automatizada

El 14 de octubre de 2026 se descargaron 32.049 filas oficiales de HECAA y
12.738 registros de montos explícitos. La revisión de 218 páginas UNAB produjo
29 tarifas tras comprobar nuevamente la modalidad; dos candidatas adicionales
se rechazaron por contradicción con el índice. El catálogo complementario quedó
con 70 registros, incluyendo la carga institucional inicial revisada.

La medición de la aplicación encontró 14.632 ofertas activas: 7.396 con monto
oficial reportado (50,55%) y 49 con tarifa institucional del año actual (0,33%).
No se ha alcanzado una mayoría de precios con vigencia confirmada. El informe
por institución permite priorizar los faltantes y añadir adaptadores verificables
sin rellenar huecos con estimaciones.

## Ampliación por lotes del 14 de octubre de 2026

El índice conserva ahora las identidades activas publicadas en HECAA. Para filas
que Socrata marca activas se exige una identidad activa del mismo contexto; una
fila inactiva no se sustituye por un programa actual. Se normalizan únicamente
alias exactos de municipios: Cali/Santiago de Cali, Cartagena/Cartagena de Indias,
Cúcuta/San José de Cúcuta, Tolú/Santiago de Tolú y Bogotá/Bogotá D.C. Los códigos
institucionales y modalidades siguen separados; contradicciones de montos entre
alias se mantienen sin precio seleccionado.

Se añadieron 27 tarifas publicadas de Javeriana Cali y 22 de UAO, más 1.527
registros de gratuidad del SENA asociados a identidades activas de HECAA. El
catálogo institucional tiene 1.646 registros. Estos totales de carga no equivalen
a cobertura de la aplicación: algunas ofertas no están en Socrata o no tienen
identidad inequívoca allí.

La comprobación final deduplicada encontró 14.614 ofertas activas: **9.535 con
monto oficial reportado (65,25%)**, frente a 7.396 antes de la ampliación, y
**1.157 con vigencia institucional 2026 confirmada (7,92%)**. De estas últimas,
1.068 corresponden a formación gratuita del SENA. No son 9.535 precios vigentes
confirmados: SNIES sigue sin proporcionar el año de cada monto.

| Institución | Ofertas activas con monto antes | Después | Con vigencia 2026 confirmada |
|---|---:|---:|---:|
| Javeriana Cali | 1 | 70 | 23 |
| UAO | 0 | 73 | 15 |
| Icesi | 0 | 58 | 0 |
| SENA | 0 | 1.068 | 1.068 |

Icesi recuperó montos SNIES gracias al cruce geográfico, sin asignarles un año.
Su resolución de tarifas escaneada no se incorporó automáticamente: una extracción
sin texto fiable requiere revisión y no justifica adivinar importes.

Para actualizar un solo recolector HTML/política:
`npm run tuition:collect --workspace=data-integration -- --source=javeriana-cali`
(también `unab` y `sena`). Los nuevos recolectores forman parte del workflow
semanal existente; la activación sigue requiriendo que llegue a la rama principal.
La publicación SENA usada para corroborar el año es de 2026: en años posteriores
debe configurarse evidencia oficial nueva, sin extender su vigencia por defecto.

## Segundo lote: Universidad Libre

El recolector `tools/libre-tuition.mjs` incorpora la [Resolución 43 de 2025,
valores 2026](https://www.unilibre.edu.co/normativas/resolucion-n-o-43-de-2025-derechos-pecuniarios-2026/).
Verifica las siete tablas por artículo y seccional, el año en cada encabezado,
las columnas de ciclos I/II y la identidad activa exacta por institución, ciudad,
nombre, nivel y modalidad cuando es explícita. Una modalidad no indicada solo
se admite si hay una única identidad activa. Interpreta rowspan sin trasladar
precios de cohortes posteriores a primer ingreso. Solo acepta rangos que empiezan
en I o valores explícitos de año, con importes enteros iguales en ambos ciclos.
N/A, precios diferentes, identidades ambiguas y programas no encontrados quedan
en el informe de pendientes. No calcula precios por crédito ni incrementos.

El encabezado «semestre o año» no permite inferir el período de todos los programas:
se conserva ACADEMIC_PERIOD salvo «semestralizado» explícito, y las tarifas anuales
se identifican como tales en la nota. La resolución configurada es de 2026; el
recolector rechaza años posteriores hasta configurar una nueva fuente oficial.

Se cargaron **171 tarifas**, sin conflictos, y el catálogo institucional pasó a
**1.817 registros**. En la aplicación corresponden a **148 ofertas activas**:
11 antes no tenían importe y otras 137 ahora tienen vigencia confirmada. La
medición final es **9.546 de 14.614 ofertas con monto reportado (65,32%)**, de las
cuales **1.305 tienen vigencia institucional 2026 confirmada (8,93%)**. Quedan
**5.068 ofertas sin precio**. Los totales de SNIES no garantizan vigencia actual.

Se ejecuta con:
`npm run tuition:collect --workspace=data-integration -- --source=libre`.
También se incluye en la recolección general y en el workflow semanal. El HTML
oficial consultado y los motivos de exclusión se guardan en `.tools/tuition/`.

## Ampliación de pendientes: EAN, UPB y política general SENA

La siguiente pasada incorporó **79 tarifas de EAN** desde su
[tabla de tarifas](https://universidadean.edu.co/admisiones/tarifas-y-precios)
y **118 candidatas de UPB** (116 contextos únicos) desde el
[consolidado oficial 2026](https://www.upb.edu.co/es/documentos/doc-consolidadodetarifas2026upb-1464294812511.pdf).
UPB redirige ese documento al archivo exacto
`https://portal.upb.edu.co/wp-content/uploads/2026/04/consolidado-tarifas.pdf`;
solo se permite esa migración específica o la ruta alternativa del mismo archivo.
Ambos recolectores usan el **total explícito del primer semestre**, conservan la
carga de créditos como condición y rechazan precios por crédito, promedios,
importes ausentes, decimales incompatibles, períodos anuales bajo columnas de
semestre e identidades que no se puedan resolver inequívocamente. No multiplican
créditos por tarifas. EAN omite programas que publican únicamente una resolución
sin código SNIES; UPB omite ofertas que no admiten estudiantes nuevos.

La política universal SENA se aplica ahora a las filas activas de la institución
9110, incluso cuando su identidad académica no tiene un código SNIES resuelto.
No se deriva de un programa gratuito de muestra: exige la evidencia explícita
universal del recolector, la corroboración oficial de 2026 y una huella documental
única. Conserva `reviewRequired` y el nombre pendiente. No se extiende a otras
instituciones, filas inactivas, evidencia incompleta ni años posteriores. El
catálogo tiene 1.420 ofertas SENA con formación gratuita confirmada, incluidas
352 que permanecen con identidad académica sin resolver.

El cruce de identidades reconoce alternativas **completas y literales** de título
separadas por `/` en HECAA cuando comparten la profesión inicial. No expande
`Ingeniero(a)`, no completa títulos truncados ni infiere carreras a partir del
título. Conserva la separación por ciudad, modalidad, institución y estado.

Resultado medido después de aplicar los datos: **9.931 de 14.614 ofertas activas
con monto reportado (67,96%)**, **1.771 con vigencia institucional 2026 confirmada
(12,12%)**, **4.683 pendientes** y **2.012 registros institucionales únicos**.
Son **385 ofertas adicionales con monto** y **466 adicionales con vigencia
confirmada**, frente a la medición anterior. Las filas institucionales cargadas
no equivalen al número de ofertas activas expuestas por Socrata.

De los pendientes, **2.974 carecen de identidad académica inequívoca** y **1.709
carecen de monto verificado** pese a tener identidad. Estos motivos están en el
informe de cobertura por fila y por institución. No se puede afirmar que los
4.683 casos restantes tengan una tarifa fija publicada. Algunas universidades
liquidan el valor según condiciones individuales del estudiante; esa liquidación
no se sustituye por un promedio, un mínimo o gratuidad condicionada.

En esta revisión el acuerdo 49/2025 de UAN devolvió un PDF escaneado sin texto
extraíble; la página consultada de Tadeo devolvió HTTP 403, y el calendario II-2026
consultado de UNITECNAR devolvió HTTP 404. No se incorporaron montos desde copias
de buscadores o documentos que no se pudieron verificar directamente.

EAN se incluye en el recolector general:
`npm run tuition:collect --workspace=data-integration -- --source=ean`.
UPB se incluye junto a UAO en:
`npm run tuition:collect:tables --workspace=data-integration`.
Los dos quedan dentro del workflow semanal existente. La automatización remota
solo corre cuando estos cambios llegan a una rama con el workflow habilitado.

Validación de esta pasada: 121 pruebas de integración Node, 78 de frontend y 11
pruebas Python; las 210 pasaron. Se verificó además la cobertura con el catálogo
público real después de incorporar los datos.

## Casos adicionales resolubles: contexto académico completo y dos tarifarios

El índice conserva ahora `activeDetails`, leído del mismo XLSX oficial y con la
misma huella documental que `records` y `activeRecords`. Cada fila mantiene
`[SNIES, institución, modalidad, municipio, nivel de formación, créditos,
períodos de duración, periodicidad]`, sin inferir equivalencias de duración.
El recolector semanal vuelve a importar estos campos en cada actualización.

Cuando el cruce literal de título, institución, ciudad, modalidad y estado deja
varios códigos activos, se usan adicionalmente los cuatro campos académicos si
están completos en ambos catálogos. Créditos y períodos solo admiten enteros
positivos; `160.0` y `160` son el mismo entero. Se reconocen únicamente las
etiquetas oficiales equivalentes Universitaria/Universitario y
Tecnológica/Tecnológico. Una candidata sin metadatos completos o con metadatos
contradictorios impide deducir unicidad eliminándola. Si no hay una coincidencia
única, se mantiene el resultado anterior, sin borrar un nombre ya verificado ni
escoger un código por tener precio. No se expanden variantes de género implícitas.

La auditoría `.tools/tuition/identity-disambiguation-audit.json` registra
**110 identidades recuperadas**, 65 con monto reportado, y **ningún código
previamente resuelto fue sustituido**. Conserva por caso la fila de Socrata,
el código seleccionado y los metadatos HECAA que sustentan el cruce.

Se añadieron **9 tarifas fijas CES** desde su
[tarifario oficial](https://www.ces.edu.co/becas-y-apoyo-financiero/tarifas-derechos-pecuniarios/)
y **10 tarifas de Universidad Metropolitana** desde su
[tabla de pregrados 2026](https://cloud.unimetro.edu.co/precios%20matriculas%202026.pdf).
CES se limita al apartado «Derechos de matrícula 2026», sin mezclar inscripción,
seguros u otros derechos. Excluye etiquetas de crédito, promedios, descuentos,
agrupaciones ambiguas y coincidencias múltiples. Metropolitana exige íntegra la
tabla de once importes; Enfermería quedó pendiente por identidad ambigua. Ambos
adaptadores exigen una única oferta activa exacta y conservan ACADEMIC_PERIOD
porque esas tablas no declaran la duración del período que cobran. No afirman
que ese valor sea un semestre ni el costo total de la carrera.

CES entra en el recolector HTML general (`--source=ces`) y Metropolitana en el
recolector de tablas junto a UAO y UPB. Sus fuentes y pendientes quedan en
`.tools/tuition/`. No se publicaron cambios remotos ni se arrancó la aplicación.

La comprobación final con el catálogo real encontró **14.610 ofertas activas**,
**9.996 con monto reportado (68,42%)**, **1.788 con vigencia institucional 2026
confirmada (12,24%)** y **4.614 pendientes**. Frente a la pasada anterior hay
**65 ofertas adicionales con importe** y **17 adicionales con vigencia
confirmada**. La diferencia de cuatro ofertas en el denominador corresponde a
registros que ahora comparten un código resuelto y se deduplican por institución,
código, modalidad y ciudad; no son cuatro tarifas añadidas. Los 65 importes
recuperados no se presentan todos como tarifas vigentes: los de SNIES siguen con
año desconocido. El catálogo complementario tiene **2.031 registros**.

Los pendientes actuales se distribuyen en 2.864 identidades sin código inequívoco
y 1.750 ofertas identificadas sin monto verificado. Resolver la identidad de una
oferta sin tarifa cambia el motivo del pendiente, sin fabricar un precio.
Validación: 125 pruebas Node de integración y 17 pruebas Python aprobadas,
compilación TypeScript correcta y medición de cobertura posterior a los cambios.

## Revisión del grupo de 1.750 ofertas identificadas sin monto

Se incorporaron tres fuentes adicionales:

- **UAO posgrados:** 47 tarifas completas por semestre desde la
  [Resolución 758 de 2025](https://www.uao.edu.co/wp-content/uploads/2025/12/Res-CS-758-Valor-Matricula-prosgrado-2026.pdf).
  El adaptador exige los artículos 2 y 3 y sus encabezados de matrícula completa
  para ambos períodos de 2026. Excluye el artículo 4 de precios por crédito,
  identifica la modalidad combinada expresamente como presencial-virtual y
  rechaza coincidencias múltiples. Los importes no incluyen Procultura ni
  nivelatorios.
- **Tadeo:** 55 tarifas revisadas visualmente en el PDF escaneado del
  [Acuerdo 014/2025](https://www.utadeo.edu.co/sites/tadeo/files/node/wysiwyg/2025014.pdf)
  y su [adición 002/2026](https://www.utadeo.edu.co/sites/tadeo/files/node/wysiwyg/2026002.pdf).
  La transcripción en `data/tadeo-reviewed-tuition-2026.json` conserva las páginas,
  ciudad, modalidad explícita cuando existe y las huellas de ambos documentos.
  El OCR local solo ayudó a localizar las tablas; los valores se contrastaron
  con sus imágenes, incluido el importe por semestre del Doctorado en Ingeniería
  de la adición. No se usaron los totales de la carrera ni multiplicaciones.
  Se excluyeron programas de pregrado con tarifas diurnas y nocturnas diferentes,
  y el Doctorado en Ciencias del Mar expresado en salarios mínimos. La revisión
  periódica exige que ambos PDF sigan idénticos: si cambia alguno, retira a
  cuarentena las tarifas Tadeo de esa revisión y exige una nueva comprobación
  visual. No introduce OCR automático en producción ni depende de macOS en CI.
- **UNITECNAR:** 68 tarifas ordinarias de pregrado por formación y modalidad desde
  el [Acuerdo 07-25 para el año lectivo 2026](https://www.unitecnar.edu.co/web/content/23715/Acuerdo%20N.%2007-25%20Derechos%20Pecuniarios%202026.pdf?unique=6a3dcbf856056347b42c473dbf049708ec93b25c),
  localizado en el índice institucional actualizado. Se toma la columna
  ORDINARIA, separada de EXCEPCIONAL y EXTRAORDINARIA. La formación se obtiene de
  `activeDetails` de HECAA; no se deduce del nombre del programa. El cruce se
  limita a Cartagena y conserva la condición de carga superior a ocho créditos,
  sin calcular la tarifa reducida de cargas menores. Gestión Gastronómica usa su
  importe excepcional específico, que incluye uniforme. Se excluyen extensiones
  de otras ciudades y posgrados sin tarifa inequívoca. No incluye seguro,
  Procultura ni otros derechos; se indica confirmar el calendario de pago.

La página de inscripciones UAN consultada ya publica **2027-1**, por lo que sus
104 tablas se excluyeron del catálogo vigente de 2026. No se convirtió su año
futuro en año actual ni se reutilizaron los importes del buscador.

El catálogo complementario pasó de 2.031 a **2.201 registros**. La medición real
posterior encontró **10.035 ofertas con monto reportado de 14.610 (68,69%)** y
**1.917 con vigencia institucional 2026 confirmada (13,12%)**. Se resolvieron
**39 casos de los 1.750 originales**, que ahora quedan en **1.711**. Otras **90
ofertas** tenían ya un monto reportado y ganaron confirmación de vigencia; no se
cuentan como casos sin precio resueltos. Las incorporaciones agregan en total
129 ofertas con vigencia confirmada, 39 de ellas anteriormente sin precio.

Los pendientes generales son **4.575**, incluidas 2.864 identidades todavía
ambiguas. La lista exacta de los 39 casos resueltos está en
`.tools/tuition/no-price-resolved.json`, calculada comparando identificadores de
fila antes y después; los informes por recolector conservan los rechazos.

Las tres fuentes están integradas en `tuition:collect:tables`, usado por el
workflow semanal existente. Tadeo puede revalidarse por separado con
`npm run tuition:collect:tadeo --workspace=data-integration`. Los nuevos valores
solo se muestran bajo sus condiciones publicadas; no son cotizaciones
individuales ni precios estimados. La aplicación permanece sin arrancar.

## Continuación del grupo de 1.711: Uniguajira y Caldas

Se añadieron **18 tarifas ordinarias de posgrado Uniguajira** desde su
[página de valores de matrículas](https://uniguajira.edu.co/oficina-de-registro-y-control-academico/valores-de-matriculas/).
El recolector exige una sola sección de vigencia 2026 y las tarjetas separadas
de matrícula ordinaria para maestrías, especializaciones y doctorados. Contrasta
el importe visible con el contador de la propia tarjeta, cuando está presente.
El nivel se cruza con `activeDetails` de HECAA; se rechaza la formación ausente
o contradictoria. No se usa matrícula extraordinaria ni la política condicional
de gratuidad. El alcance actual se limita a posgrados; no aplica por defecto la
tarifa general de pregrado a programas de salud con tarifas diferentes.

El [Acuerdo 05/2026 de Caldas](https://artesyhumanidades.ucaldas.edu.co/wp-content/uploads/Acuerdo-05_-29-de-enero_matricula-inscripcion-y-otros-factores-relacionados-con-los-programas-de-posgrado-1-1.pdf)
contiene su tabla como imagen. Se revisaron los importes **literales de la columna
2026**, conservados en `data/caldas-reviewed-tuition-2026.json` con la huella del
PDF y página 3. No se calculó un salario mínimo ni un porcentaje. Se excluyeron
los importes «Por convenio», el Doctorado en Estudios Territoriales que figura
con dos importes diferentes y la maestría que expresa que no abre cohorte nueva.
La Epidemiología anualizada conserva esa condición en la nota; los demás valores
se muestran por período académico sin inventar la duración que cobra cada fila.

El artículo 1 (página 2) declara expresamente la aplicación a **cohortes activas
y nuevas**. Por ello, cuando varios códigos activos comparten exactamente nombre,
ciudad y modalidad, la tarifa publicada del programa se conserva para cada código.
No se selecciona uno en el catálogo de programas ni se deduce identidad desde el
precio. Si el documento no tuviera ese alcance expreso, o las modalidades fueran
diferentes, seguirían pendientes. Así se verificaron **67 registros Caldas**.

La revalidación de Caldas comprueba que el PDF publicado conserve la misma huella
que la revisión visual. Si cambia, retira sus tarifas de esa revisión a cuarentena
y exige revisarlas de nuevo. Tanto Caldas como Uniguajira se incorporaron al
workflow semanal existente: Caldas en `tuition:collect:tables`, Uniguajira en la
recolección HTML general y opcionalmente con `--source=guajira`. No se requiere
OCR ni una dependencia de descifrado en producción para revalidar las huellas.

La consulta de UNICOC falló por certificado HTTPS vencido; sus valores no se
incorporaron desde copias del buscador ni desactivando la validación TLS. El índice
de Boyacá consultado ya publica documentos 2027; no se trasladó ese año a 2026.

Resultado: **5 casos adicionales resueltos**, y el grupo de 1.711 queda en
**1.706 pendientes**. Otras **55 ofertas** ya tenían un monto reportado y ahora
tienen vigencia institucional 2026 confirmada. En total esta pasada agrega 60
ofertas con vigencia confirmada. La lista de los cinco casos se conserva en
`.tools/tuition/remaining-1711-resolved.json`.

El catálogo complementario tiene **2.286 registros**; la medición con el catálogo
real encuentra **10.040 de 14.610 ofertas con monto reportado (68,72%)**, **1.977
con vigencia institucional 2026 confirmada (13,53%)** y **4.570 pendientes**,
compuestos por los 1.706 sin importe y las 2.864 identidades ambiguas. No se ha
completado el resto ni se considera que todos estos casos sean imposibles: faltan
fuentes numéricas, alcances de tarifa o identidades que permitan verificarlos.
Validación: 138 pruebas de integración aprobadas y comprobación posterior de
cobertura. La aplicación no se arrancó y no se publicaron cambios remotos.
