# Challenge Backend - Servicio de Ingestión de Archivos

Este proyecto contiene un microservicio Node.js desarrollado en TypeScript para procesar archivos de clientes y volcar los datos en una base de datos SQL Server. El servicio está diseñado para ejecutarse en un entorno Docker/Kubernetes, optimizado para recursos limitados y archivos de gran tamaño.

## Estructura del Proyecto

.
├── Dockerfile                  # Define cómo construir la imagen Docker del servicio.
├── docker-compose.yml          # Define y orquesta los servicios Docker (SQL Server y Backend).
├── package.json                # Dependencias y scripts del servicio backend.
├── tsconfig.json               # Configuración de TypeScript para el servicio.
├── init_db/                    # Contiene scripts SQL de inicialización para la base de datos.
│   └── init.sql                # Script para crear la DB 'challenge_clients_db' y la tabla 'Clientes'.
├── src/                        # Código fuente del microservicio backend.
│   ├── index.ts                # Lógica principal del servidor Express, conexión DB y procesamiento.
│   └── generateFile.ts         # Script para generar archivos de datos de prueba (provisto por el challenge).
├── challenge/                  # Carpeta proporcionada por el challenge.
│   └── input/                  # Ubicación del archivo de entrada a procesar.
│       └── CLIENTES_IN_0425.dat # Archivo de prueba (provisto).
├── .gitignore                  # Archivos y directorios a ignorar por Git.
└── README.md                   # Este documento.

## Requisitos Previos

Antes de ejecutar la solución, hay que tener instalados los siguientes componentes:

* **Docker Desktop:** Para ejecutar los contenedores Docker (configurado para usar WSL 2 en Windows para un mejor rendimiento).
* **Node.js y npm:** Versión 18 o superior (necesario para instalar dependencias).

## Pasos para Levantar la Solución Localmente

Estos son los pasos para poner en marcha el servicio y la base de datos en tu máquina local:

### 1. Clonar el Repositorio e Instalar Dependencias

Clonar este repositorio y navegar al directorio del proyecto:

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd backend-challenge-file-ingestion