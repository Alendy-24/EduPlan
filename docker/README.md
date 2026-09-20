# PostgreSQL local con Docker

Esta configuracion crea una base de datos de desarrollo aislada para EduPlan.
No reemplaza ni modifica la instalacion nativa de PostgreSQL de Windows.

## Puertos

- PostgreSQL instalado en Windows: `localhost:5432`.
- PostgreSQL de Docker para EduPlan: `localhost:5433`.

Se usan puertos distintos para que ambos puedan estar encendidos al mismo tiempo.

## Primera ejecucion

1. Tener Docker Engine activo en WSL. En este equipo ya quedo instalado como
   servicio de Ubuntu, por lo que no es necesario abrir Docker Desktop.
2. Desde la raiz del repositorio, entrar a la carpeta `docker`:

   ```bash
   cd docker
   ```

3. Crear los archivos locales a partir de los ejemplos:

   ```bash
   cp .env.example .env
   cp backend.env.example backend.env
   ```

4. Reemplazar los valores `CHANGE_ME...` en ambos archivos. La contrasena de
   `POSTGRES_PASSWORD` y `DB_PASSWORD` debe ser exactamente la misma.
5. Levantar PostgreSQL:

   ```bash
   sudo docker compose up -d
   sudo docker compose ps
   ```

Los archivos `.env` y `backend.env` son locales y Git los ignora. Nunca se
deben subir contrasenas reales al repositorio.

## Ejecutar el backend

En Visual Studio Code, abrir la carpeta raiz `EduPlan`, ir a **Run and Debug** y
elegir `EduPlan Backend (Docker PostgreSQL)`. La configuracion
`.vscode/launch.json` carga automaticamente `docker/backend.env`.

Desde una terminal tambien se puede cargar esas mismas variables y ejecutar el
Maven Wrapper ubicado en `backend/src`.

En WSL, desde la raiz de `EduPlan`, usar tres terminales:

```bash
# Terminal 1: base de datos (puede cerrarse despues de levantarla)
cd docker
sudo docker compose up -d
```

```bash
# Terminal 2: API que consulta Socrata
cd data-integration
npm start
```

```bash
# Terminal 3: backend conectado a la base Docker
cd backend/src
set -a
source ../../docker/backend.env
set +a
./mvnw spring-boot:run
```

Con los tres componentes activos, la sincronizacion completa se ejecuta desde
una cuarta terminal en la raiz de `EduPlan`:

```bash
set -a
source docker/backend.env
set +a
curl --request POST \
  --header "X-Sync-Token: ${DATA_SYNC_ADMIN_TOKEN}" \
  http://localhost:8080/api/admin/data-sync
```

Al iniciar correctamente, Flyway crea las tablas en la base `eduplan_db`. Los
datos de instituciones y programas se insertan cuando se ejecuta la
sincronizacion contra el servicio Node.js; levantar PostgreSQL por si solo crea
la base, pero no descarga datos de Socrata.

## Ver la base en pgAdmin

Registrar un servidor adicional con estos datos:

- Host: `localhost`
- Puerto: `5433`
- Base de mantenimiento: `eduplan_db`
- Usuario y contrasena: los valores de `docker/.env`

La conexion existente al puerto `5432` muestra la base nativa de Windows, no la
base del contenedor.

## Comandos utiles

```bash
sudo docker compose ps
sudo docker compose logs postgres
sudo docker compose stop
sudo docker compose start
sudo docker compose down
```

`sudo docker compose down` elimina el contenedor y la red, pero conserva los datos
en el volumen. `sudo docker compose down -v` tambien borra el volumen y todos los
datos, por lo que solo debe usarse si se desea reiniciar completamente la base.
