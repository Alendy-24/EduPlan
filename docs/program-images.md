# Fotografías de programas

Las tarjetas, recomendaciones y el detalle usan fotografías reales de Pexels,
guardadas en `frontend/public/images/programs/`. No necesitan una API key.
Son fotos de referencia de la disciplina, no fotos oficiales de una carrera o sede.
Se muestra ese aviso junto a la atribución del fotógrafo.

`frontend/src/data/program-images.js` conserva las fuentes y asociaciones.
La selección usa primero una excepción por `sourceId`, después las reglas
visuales revisadas de `programImageDisciplines` sobre el nombre oficial.
Las entradas de `programCareerImages` asignan una fotografía propia a un nombre
normalizado y tienen prioridad sobre esas familias. Bioingeniería ya tiene
una foto específica de laboratorio en ese registro. El resto de las familias
todavía comparte fotos; no hay cobertura individual completa de todo el catálogo.
Se normalizan tildes, puntuación y conectores. Un mismo nombre mantiene la
misma foto por defecto entre instituciones aunque el NBC difiera o falte.
Mecánica usa engranajes; Civil y Arquitectura, una obra; Electrónica, circuitos;
Industrial, una fábrica; Sistemas/Software, un computador.
Un nombre oficial sin asociación visual revisada usa la biblioteca de respaldo.
El NBC solo se usa si falta un nombre oficial utilizable; ninguna ingeniería
desconocida se convierte automáticamente en una foto de computador.
Estas reglas asignan una ilustración editorial y no modifican la clasificación
académica. Una descarga fallida usa la biblioteca, y si también falla se muestra
«Fotografía no disponible». Los datos del catálogo permanecen intactos.

## Fuentes

Descargadas y revisadas visualmente el 7 de octubre de 2026. JPEG de 960 × 640,
comprimidos y recortados por el servicio de imágenes de Pexels.
Licencia: [Pexels](https://www.pexels.com/license/).
No se usó generación de imágenes con IA.

| Archivo | Fotógrafo | Fuente |
| --- | --- | --- |
| bioingenieria.jpg | Polina Tankilevitch | [Laboratorio](https://www.pexels.com/photo/scientist-in-laboratory-3735709/) |
| mecanica.jpg | Tim Mossholder | [Engranajes](https://www.pexels.com/photo/close-up-shot-of-metal-gears-4843915/) |
| civil.jpg | 8 K | [Obra](https://www.pexels.com/photo/construction-site-along-the-road-2833686/) |
| electronica.jpg | ClickerHappy | [Circuitos](https://www.pexels.com/photo/shallow-focus-photography-of-black-circuit-board-1448561/) |
| industrial.jpg | Anna Shvets | [Fábrica](https://www.pexels.com/photo/an-industrial-machine-in-a-factory-5953729/) |
| tecnologia.jpg | cottonbro studio | [Portátil](https://www.pexels.com/photo/man-using-a-laptop-5474282/) |
| salud.jpg | Pavel Danilyuk | [Estetoscopio](https://www.pexels.com/photo/stethoscope-on-white-surface-6753427/) |
| ciencias.jpg | Edward Jenner | [Microscopio](https://www.pexels.com/photo/a-man-using-a-microscope-in-a-laboratory-4033019/) |
| artes.jpg | Steve A Johnson | [Pintura y pinceles](https://www.pexels.com/photo/two-paintbrushes-on-multicolored-abstract-painting-1061779/) |
| negocios.jpg | Vlada Karpovich | [Reunión](https://www.pexels.com/photo/business-partners-having-a-meeting-at-the-office-7433859/) |
| sociales.jpg | Andy Barbour | [Conversación en aula](https://www.pexels.com/photo/students-having-conversation-inside-the-classroom-6683485/) |
| educacion.jpg | Max Fischer | [Docente y estudiantes](https://www.pexels.com/photo/a-teacher-standing-in-the-classroom-5212703/) |
| agro.jpg | Maria Firman | [Invernadero](https://www.pexels.com/photo/sprouts-and-plants-in-greenhouse-12152936/) |
| general.jpg | Mikhail Nilov | [Biblioteca](https://www.pexels.com/photo/photo-of-classmates-studying-in-a-library-7777676/) |

## Personalizar una carrera

Guarda una foto que puedas utilizar legalmente en la misma carpeta y añade
una entrada a `programImageOverrides`, usando el `sourceId` exacto de la oferta:

```js
'upr9-nkiz:IDENTIDAD_REAL': {
  src: '/images/programs/mi-carrera.jpg',
  alt: 'Descripción de la fotografía',
  author: 'Nombre del fotógrafo',
  sourceName: 'Pexels',
  sourceUrl: 'https://www.pexels.com/photo/enlace-real/',
},
```

El ejemplo no es una identidad válida para una oferta concreta; sustitúyelo
por la identidad publicada. Para cambiar todas las carreras de un área, cambia
su entrada en `programImages` o añade una frase específica a
`programImageDisciplines`, antes de las reglas más generales. Las excepciones
por `sourceId` permiten fotos propias de una oferta y son la única diferencia
intencional entre ofertas con el mismo nombre. Si usas otra fuente, adapta
el campo `sourceName` y registra su licencia aquí.

Pruebas: `node --test frontend/tests/program-images.test.mjs` verifica el caso
de Mecánica con metadatos diferentes, las disciplinas de ingeniería, archivos
locales y la estabilidad de los 32.011 nombres del índice oficial ante NBC
conflictivos o ausentes. Esto comprueba consistencia; no certifica una asociación
visual específica para cada nombre todavía desconocido.
# Fotografías automáticas por carrera

Pexels suspendió la emisión de nuevas claves (verificado el 7 de octubre de
2026). Para nuevas instalaciones usar https://unsplash.com/developers:
registrar una aplicación y guardar su **Access Key**, no su Secret Key, como
`UNSPLASH_ACCESS_KEY=...` en `data-integration/.env`. Reiniciar `npm run dev`.
Unsplash tiene prioridad si están configurados ambos proveedores. El modo
demo permite 50 peticiones por hora; las fotos guardadas no vuelven a buscarse.
Se utilizan las URLs originales del proveedor para las imágenes y se registra
la selección mediante su endpoint de descarga. La atribución incluye el enlace
de referencia exigido. El caché también admite los ID de Unsplash sin colisionar
con los de Pexels.

La integración `/api/programs/photo?name=...` busca el nombre oficial en el proveedor.
Crear una clave en https://www.pexels.com/api/ y poner `PEXELS_API_KEY=...`
en `data-integration/.env` (archivo ignorado). Reiniciar `npm run dev`.
La clave queda en el servidor; la clave de Logo.dev no sirve para este proveedor.

Solo se consultan nombres del catálogo oficial. Las tarjetas visibles comparten
una consulta por nombre. La primera selección se guarda en
`data-integration/.cache/career-photos.json`, conserva autor/enlace y se reutiliza
entre universidades y reinicios. Las carreras distintas no reservan el mismo ID
del proveedor. Conservar este archivo al desplegar para mantener las selecciones.
Las fotos locales específicas revisadas, como Bioingeniería, tienen prioridad.

Sin clave, ante errores, cuotas agotadas o sin candidatos distintos, se conserva
la fotografía local. Por tanto la cobertura individual no está completa sin
activar el proveedor. Los resultados de una búsqueda automática no garantizan
correspondencia académica: revisar selecciones y usar `programCareerImages` para
corregirlas. No se generan imágenes con IA.
