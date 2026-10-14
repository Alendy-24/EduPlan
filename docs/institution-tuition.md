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

Desde la raíz:

```bash
npm run tuition:refresh:snies --workspace=data-integration
npm run tuition:collect --workspace=data-integration
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
