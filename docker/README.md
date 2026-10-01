# PostgreSQL de desarrollo

Docker es infraestructura interna: solo ejecuta PostgreSQL. El frontend,
data-integration y Spring Boot corren en el host para conservar hot reload.

Desde la raíz, con Node compatible, JDK 21+ y Docker/Compose v2 disponibles:

```bash
npm install
npm run dev
```

Abre **http://localhost:3005**. No copies `.env` ni `backend.env`.
La configuración se genera en `.tools/local-dev/`, ignorada por Git. El arranque
no carga los archivos antiguos `docker/.env` y `docker/backend.env`.
La contraseña se conserva en `docker-database.json`; `postgres.env` se genera
para Compose. Nunca compartas ni subas estos archivos.

PostgreSQL escucha solo en loopback, puerto 5433; el volumen
`eduplan_eduplan_postgres_data` conserva los datos. Ctrl+C detiene los procesos
Node/Java y deja PostgreSQL disponible. `npm run dev:db:stop` lo detiene sin
borrar datos. Una base externa configurada mediante las tres variables DB_*
evita Docker por completo. Consulta el [inicio rápido y diagnóstico](../README.md).

## Uso avanzado y troubleshooting

Después del primer arranque, desde la raíz:

```bash
docker compose --env-file .tools/local-dev/postgres.env -f docker/docker-compose.yml ps
docker compose --env-file .tools/local-dev/postgres.env -f docker/docker-compose.yml logs postgres
npm run dev:db:stop
```

Para inspección con pgAdmin: host localhost, puerto 5433, base eduplan_db,
usuario eduplan y contraseña del archivo local generado. Flyway crea el esquema;
la sincronización administrativa del catálogo requiere tokens explícitos y no
se ejecuta automáticamente. Consulta [la documentación de enlaces](../docs/program-links.md)
y las variables administrativas en `backend.env.example`.

En un uso manual independiente, `.env.example` documenta las variables Compose;
exporta una contraseña aleatoria antes de `docker compose up -d --wait postgres`.
No mezcles credenciales manuales con un volumen ya inicializado. No hay una
contraseña predeterminada. Si faltan las credenciales de un volumen existente,
el arranque falla para preservar los datos: recupera la contraseña original.

El flujo anterior WSL conserva su volumen y contraseña mediante migración de
`wsl-database.json`. La base nativa anterior de Windows permanece intacta y puede
usarse como base externa. No se elimina ni se convierte automáticamente.

Para un error de daemon o de permisos ejecuta `npm run doctor`. No ejecutes
Compose con sudo como parte del flujo del proyecto; resuelve primero el acceso
a Docker según el diagnóstico. Nunca se cambian permisos del sistema.
