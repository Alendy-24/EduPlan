# Perfilamiento de EduPlan

Implementación del 30 de septiembre de 2026. La referencia visual del usuario guía los pasos numerados, las superficies blancas sobre fondo claro, los títulos serif, el resumen verde, la ilustración de orientación y la cuenta en dos bloques.

## Arquitectura y contratos

- **Perfil académico** integra nivel, cobertura, departamento/ciudad, modalidad, siete áreas y seis motivaciones. `AcademicPreferencesForm` coordina componentes pequeños en `frontend/src/components/profile/`.
- **Orientación** presenta una ilustración, beneficios y un botón deshabilitado con explicación de disponibilidad. No hay preguntas, resultados, duración inventada, diagnóstico ni modificaciones al recomendador.
- **Resultados** conserva el enlace a `/recomendaciones`, guardados, comparación y detalles existentes.
- **Cuenta** contiene nombre, teléfono opcional, correo bloqueado, foto local y sesión. Conserva las APIs y la compresión/aislamiento de fotos por cuenta.

`/perfil?seccion=perfil`, `preferencias` e `intereses` abren el perfil integrado. Los destinos actuales usan `/perfil`, `?seccion=orientacion`, `?seccion=resultados` y `?seccion=cuenta`. Las pestañas conservan navegación por teclado y estados ARIA.

Se reutilizan `GET/PUT /api/me/preferences`, `/interests`, `/account`, `/saved` y `POST /api/recommendations`. No cambian backend, migraciones, campos persistentes ni scoring. Guardar coordina preferencias e intereses sin simular una transacción entre ambos endpoints: ante un fallo parcial indica lo pendiente y permite reintentarlo. La cola existente de intereses conserva su aislamiento por cuenta y su recuperación ante fallos de red/almacenamiento.

## Ubicación y completitud

El selector utiliza la copia local de [DIVIPOLA de DANE](https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w), consultada el 30 de septiembre de 2026: 32 departamentos, Bogotá D.C. y 1.122 registros territoriales. [API de origen](https://www.datos.gov.co/resource/gdxc-w37w.json). La consulta utilizó `$limit=2000`, los campos `cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio` y orden `cod_mpio`; la UI no depende de una consulta externa al editar.

La ciudad pertenece al departamento seleccionado. Cambiar departamento limpia ciudad; Mi departamento conserva únicamente departamento; Todo Colombia limpia y oculta ambos. Se normalizan acentos y variantes históricas de Bogotá. Una combinación antigua incompatible se limpia en el borrador y se comunica al usuario; los datos remotos cambian solamente al guardar. Se conserva el valor heredado `RELOCATE` cuando existe. No se inventaron regiones ni campos de jornada, fortalezas o aptitudes que el modelo no posee.

Se conserva el cálculo de seis respuestas reales: área, motivación, nivel, modalidad, cobertura y ubicación aplicable, cada una con igual peso. El porcentaje redondea respuestas completas / 6. Orientación no cuenta. El resumen refleja el borrador; la vista previa consume el perfil guardado y lo indica cuando hay cambios pendientes. Solo muestra programas devueltos por el recomendador existente.

## Validación

En PowerShell, se configuró `EDUPLAN_TEST_URL=http://localhost:3006` para respetar la instancia existente en 3005, y `EDUPLAN_PLAYWRIGHT_PATH` apuntó a Playwright instalado. La configuración habitual del proyecto sigue siendo localhost:3005. Spring corrió en 8080 con la base PostgreSQL local existente; el catálogo de QA corrió en 3002. Se crearon únicamente cuentas locales de prueba.

| Comando | Resultado |
| --- | --- |
| `npm run lint --workspace frontend` | Pasa |
| `npm run test --workspace frontend` | 42 pruebas pasan |
| `npm run build --workspace frontend` | Pasa |
| `node frontend/tests/profile-redesign-smoke.mjs` | Contratos con fixtures: dependencias, coberturas, recarga, fallos/reintentos, aliases, teclado, guardado desde vista previa, cuenta y 24 vistas |
| `node frontend/tests/profile-persistence-smoke.mjs` | Spring/PostgreSQL real: registro, perfil, coberturas, recarga, cuenta, segundo navegador y cerrar sesión |
| `node frontend/tests/recommendations-live-smoke.mjs` | MEN/SNIES y Spring reales: top 20, dashboard, guardar/comparar/detalle, aislamiento y 25 vistas |
| `node frontend/tests/account-sync-smoke.mjs` | Sincronización real entre contextos; pendientes, borrado, intereses y almacenamiento bloqueado |
| `node frontend/tests/refinement-smoke.mjs` | Fotos, aislamiento de cuentas, pestañas, instituciones, asistente y 24 vistas |
| `node frontend/tests/browser-smoke.mjs` | 56 casos de rutas/anchuras; auth, catálogo, guardados y comparación |
| `git diff --check` | Pasa |

Capturas y reporte reproducibles en `.tools/qa/profile-redesign/` (ignorados por Git), cuatro secciones en 375, 390, 430, 768, 1366 y 1440 px. Las capturas de este script usan fixtures únicamente dentro del navegador de prueba; la aplicación no incorpora esos programas. Las pruebas de persistencia y recomendación usan los servicios reales.

La revisión visual comprobó alineación, jerarquía, espaciado, chips, navegación y distribución. Se corrigieron el desbordamiento móvil de un input de foto oculto, la alineación del avatar, el espacio de “Opcional”, el singular del contador y el botón de guardado de la vista previa. El resumen se coloca arriba en móvil/tablet; la vista previa queda en escritorio y los resultados siguen accesibles en todas las anchuras.

## Ilustración

Archivo final: `frontend/src/assets/Images/orientation-student.png`. Generado con la herramienta integrada `image_gen`, modo de fondo transparente; copiado al proyecto sin modificar el canal alfa. El archivo pesa aproximadamente 1,5 MB y se sirve como asset local. El prompt completo se conserva en `frontend/src/assets/Images/SOURCES.md`.
