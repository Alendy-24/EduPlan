# EduPlan

## Integrantes
- Salomé Ávila
- Daniel Cedeño
- Jose Cepeda
- Alejandro Corredor
- Sebastian Ramirez

## Diagramas

# Diagrama de Clases

<img width="848" height="646" alt="diagrama-de-clases-EduPlan" src="https://github.com/user-attachments/assets/f019621b-fc38-402c-8a10-9cfe1f6f1d98" />

# Diagrama Entidad-Relación

<img width="1600" height="657" alt="diagrama-entidad-relacion" src="https://github.com/user-attachments/assets/64658d2d-fad4-41ea-a636-f6333e58bb18" />

# Diagrama Relacional

<img width="1600" height="983" alt="diagrama-relacional" src="https://github.com/user-attachments/assets/95501677-0901-4fa9-be1f-bd155dda5a0d" />

# Diagrama de Componentes 

<img width="1667" height="886" alt="Diagrama_de_Componentes_EduPlan" src="https://github.com/user-attachments/assets/79628769-47d6-415b-9e11-fe3d106ece6b" />

# Ejecución 

## Instalar dependencias de Node.js

Desde la raíz:
```
npm install
```
Del frontend:

```
cd frontend
npm install
cd ..
```
Servicio de integración:

```
cd data-integration
npm install
cd ..
```

## Iniciar Frontend e Integración de datos

Desde la raíz del repositorio
```
npm run dev
```

## Iniciar backend 
En otra terminal

Iniciar servicio postgresql: 

```
cd docker
cp .env.example .env
cp backend.env.example backend.env
```
Editar archivo `.env` y `backend.env`
`.env`

```
POSTGRES_DB=eduplan_db
POSTGRES_USER=eduplan
POSTGRES_PASSWORD=tu_contraseña_local
POSTGRES_PORT=5433
```

`backend.env`
```
DB_URL=jdbc:postgresql://localhost:5433/eduplan_db
DB_USER=eduplan
DB_PASSWORD=una_contraseña_local
DATA_SYNC_ADMIN_TOKEN=un_token_local_de_al_menos_32_caracteres
```
Iniciar contenedor y PostgreSQL:

```
sudo docker compose up -d
sudo docker compose ps
```

Ejecutar backend Java:

```
cd backend/src
set -a
source ../../docker/backend.env
set +a
./mvnw spring-boot:run
```

En Windows para establecer las variables manualmente:

```
$env:DB_URL="jdbc:postgresql://localhost:5433/eduplan_db"
$env:DB_USER="eduplan"
$env:DB_PASSWORD="una_contraseña_local"
$env:DATA_SYNC_ADMIN_TOKEN="un_token_local_de_al_menos_32_caracteres"

cd backend/src
.\mvnw.cmd spring-boot:run
```

Linux: 

```
export DB_URL="jdbc:postgresql://localhost:5433/eduplan_db"
export DB_USER="eduplan"
export DB_PASSWORD="tu_contraseña_segura_aqui"
export DATA_SYNC_ADMIN_TOKEN="un_token_aleatorio_de_al_menos_32_caracteres"
```






