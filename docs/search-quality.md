# Verificación general de búsqueda de carreras

La búsqueda compara palabras completas del nombre oficial, título y NBC antes
de aplicar filtros, ordenar, agrupar y paginar. No convierte «química» en
«bioquímica», «sistemas» en «ecosistemas» ni «medicina» en «medición».
Un nombre más corto puede representar una versión ampliada, pero no basta una
palabra genérica como «ingeniería» para descartar la especialidad solicitada.

Una consulta completamente reconocida no recibe coincidencias por distancia
de escritura. En consultas con errores, las palabras habituales del índice
(presentes en al menos tres registros) y los términos publicados del NBC
permanecen protegidos. Eso evita que «medicina internna» cambie «medicina» por
«medición». Los nombres oficiales ocasionalmente contienen errores aislados:
por eso los términos infrecuentes pueden corregirse cuando otra palabra de la
consulta es desconocida. La distancia máxima es uno para palabras de 5–7
letras y dos para palabras de 8 o más; menos de cinco letras exige exactitud.

Los resultados y sugerencias permiten completar la última palabra desconocida,
desde dos letras y desde el comienzo de la palabra. Una última palabra de dos
letras también se completa en una consulta compuesta, como «ingeniería de si».
Los resultados publicados no mezclan fragmentos dentro de otras palabras.
«sicología» sigue encontrando Psicología
por corrección de escritura y ahora se identifica como variante de escritura.
Los nombres mostrados siempre conservan su escritura oficial.

Se mantienen las correcciones observadas para Medicina: excluye salud animal
si no se solicita explícitamente y nombres/títulos de Enfermería clasificados
en el NBC Medicina. Son correcciones de relevancia, no cambios a la fuente.

## Repetir la verificación

Desde la raíz del proyecto:

```bash
npm run search-quality --prefix data-integration
npm run test --prefix data-integration
node --test frontend/tests/*.test.mjs
```

`search-quality` usa exclusivamente el índice SNIES guardado en el repositorio;
no requiere servicios activos ni consulta internet. Falla ante una regresión.

Resultados del 7 de octubre de 2026, índice importado el 30 de septiembre:

| Comprobación | Cobertura |
| --- | ---: |
| Registros oficiales encontrados por su nombre completo | 32.011 |
| Registros encontrados sin tildes y en minúsculas | 32.011 |
| Aceptación/rechazo de filtros individuales sobre cada registro | 256.088 |
| Pares de palabras reconocidas que son prefijos de otras | 5.289 |
| Fragmentos incompletos de palabras que conservan coincidencias | 22.740 |
| Pares de palabras similares que no deben confundirse | 1.478 |
| Omisiones e intercambios de letras aceptados | 58.966 |
| Variantes que producen otra palabra reconocida, sin corrección automática | 1.027 |
| Variantes demasiado cortas, rechazadas para evitar ambigüedad | 813 |

Además hay una matriz de 18 consultas de carreras × 2 niveles × 3 modalidades
× 2 ciudades (216 combinaciones) con datos de prueba explícitos, comprobando
relevancia, filtros y totales. Las pruebas incluyen nombres compuestos,
ingenierías distintas, Medicina/Medición, salud humana/animal, Enfermería,
química/bioquímica, artes/parte y consultas con errores en varias palabras.

## Límites de esta cobertura

El índice tiene 32.011 registros (distintas ofertas pueden compartir nombre),
no 32.011 carreras distintas. La auditoría exhaustiva de nombres usa cada
registro como candidato individual; no compara cada nombre contra todas las
demás ofertas. Los controles entre candidatos se verifican mediante colisiones
de palabras y la matriz de búsquedas. Los filtros de esa matriz son fixtures,
no una certificación de la disponibilidad actual de cada carrera/modalidad.

No se garantiza relevancia semántica para todas las frases imaginables. Hay
palabras ambiguas y carreras interdisciplinarias legítimas; un NBC erróneo de
la fuente puede introducir asociaciones incorrectas. Las pruebas no inventan
una clasificación académica para resolverlo. Ampliar esa cobertura requiere
casos concretos revisados o una taxonomía de equivalencias explícita. Al
actualizar el índice, vuelve a ejecutar la auditoría y revisa los fallos.
