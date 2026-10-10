# Pujaz - Sistema de Subastas

Plataforma web para una casa de subastas basada en una arquitectura SOFEA sobre microservicios.

## Contexto del Proyecto

Este proyecto implementa un sistema de subastas distribuido, diseñado para manejar alta concurrencia y garantizar la integridad de las transacciones (pujas y pagos) utilizando un modelo "Database per Service".

## Arquitectura

El sistema está compuesto por 6 contenedores Docker, divididos según responsabilidades:

1.  **Frontend SPA:** Aplicación cliente (descargada una sola vez).
2.  **Servidor Web (Estáticos):** Sirve los archivos del frontend.
3.  **Gateway / BFF (Capa 7):** Puerta de entrada, maneja autenticación, WebSockets y orquestación.
4.  **Microservicio Transaccional:** Lógica crítica de negocio (pujas, billetera, estado de las piezas) respaldado por PostgreSQL.
5.  **Microservicio Catálogo:** Búsqueda, fichas de artículos y documentos, respaldado por MongoDB.
6.  **Bases de Datos:** Instancias separadas de PostgreSQL y MongoDB.

## Tecnologías Principales (Propuesta)

*   **Gateway / SPA:** TypeScript
*   **MS Transaccional:** Go
*   **MS Catálogo:** Python (FastAPI)
*   **Despliegue:** Docker y Docker Compose


