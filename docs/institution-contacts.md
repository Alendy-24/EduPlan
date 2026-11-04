# Teléfonos de instituciones

Revisión del 14 de octubre de 2026 sobre las 361 filas de
[MEN_INSTITUCIONES EDUCACIÓN SUPERIOR, n5yy-8nav](https://www.datos.gov.co/d/n5yy-8nav).
El informe completo está en [institution-phone-audit.csv](institution-phone-audit.csv).

## Hallazgos y alcance

- 335 teléfonos locales de siete dígitos: se añade el indicativo de su departamento.
- 7 móviles de diez dígitos: se mantienen sus dígitos y se muestra el prefijo +57.
- 12 teléfonos truncados o inválidos: contrastados y corregidos con sitios oficiales.
- 7 filas sin teléfono (`NA`): se muestran como «No disponible», sin inventar números.

La Nacional Bogotá publica `3165000` en MEN. Coincide con el número de su
[sitio oficial](https://bogota.unal.edu.co/facultades): `+57 601 316 5000`.
Sus otras sedes conservan sus propios teléfonos: no se les aplica el de Bogotá.

La tabla de indicativos corresponde a la
[distribución geográfica de la CRC](https://normograma.crcom.gov.co/crc/compilacion/docs/resolucion_crc_5967_2020.htm).
Formatear un número no demuestra que esté vigente. Se revisó el formato de todas
las filas; se contrastaron documentalmente los 12 casos inválidos y Nacional Bogotá
(13 filas). No se llamaron las líneas ni se certifican oficialmente las otras 348 filas.

## Comportamiento

`institution.phone` mantiene el valor exacto de la API. `resolveInstitutionPhone`
lo convierte a texto legible y un enlace `tel:` cuando la interpretación es segura.
No se modifica Sócrata ni la base de datos. Un formato desconocido permanece visible
con aviso y sin enlace de llamada; `NA` se muestra como ausente.

`frontend/src/data/institution-contacts.js` contiene las 13 comprobaciones por
código y municipio, con teléfono original y URL oficial. Una corrección solo se
aplica mientras código, sede y teléfono fuente coinciden con el caso revisado.
Si MEN cambia el dato, se deja de aplicar la corrección anterior. Las fuentes se
enlazan desde el detalle para poder comprobar el contacto. Actualizar esta tabla
requiere volver a consultar el sitio de la sede y registrar la nueva fecha de revisión.

No se completan los seis dígitos truncados mediante suposiciones. Por ejemplo,
`604100` se sustituyó por el número de Duitama encontrado en UPTC; `57 2 22091`
por el PBX de Zarzal; `1` por el PBX publicado por la sede Pacífico de Univalle.
Las fuentes exactas de los 12 casos están en el registro y en el CSV.

## Reproducir

Desde la raíz:

```sh
node frontend/tools/audit-institution-contacts.mjs
node --test frontend/tests/institution-phone.test.mjs
```

El primer comando consulta todas las filas y regenera el CSV. También admite
`--snapshot ruta.json` para una captura previa. Una respuesta no válida o que
alcance el límite de 50 000 filas produce un error para evitar una auditoría parcial.
