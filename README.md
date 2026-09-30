# Gestor de Colecciones Numismáticas

Aplicación web full-stack diseñada para la catalogación, gestión y visualización de colecciones de monedas y billetes. El proyecto prioriza una arquitectura de datos escalable, un rendimiento óptimo y una interfaz de usuario limpia y adaptativa.

## Arquitectura y Tecnologías

* **Backend:** Python, FastAPI.
* **Base de Datos:** PostgreSQL, SQLAlchemy (ORM).
* **Frontend:** HTML5, CSS3 (Grid/Flexbox), JavaScript Vanilla.
* **Almacenamiento de Medios:** API de Cloudinary (conversión al vuelo a WebP y redimensionamiento).

## Características Técnicas Destacadas

* **Modelo de Datos Heterogéneo (JSONB):** Implementación de herencia de tabla única (Single-Table Inheritance) utilizando columnas `JSONB` en PostgreSQL. Esto permite almacenar entidades con atributos muy dispares (monedas con diámetro y peso vs. billetes con ancho, alto y número de serie) en la misma tabla estructural sin generar un exceso de columnas nulas.
* **Algoritmo de Ordenación en Cascada (Multi-level Sort):** Sistema de ordenamiento en el cliente que resuelve empates técnicos evaluando secuencialmente múltiples dimensiones de la pieza. El orden numismático por defecto evalúa: País -> Valor Matemático -> Año de acuñación -> ID de referencia.
* **Abstracción del Valor Numérico:** Separación estricta entre la representación visual de la divisa (ej. "50 Céntimos") y su valor matemático absoluto en la base de datos (0.5), garantizando una ordenación algorítmica precisa sin necesidad de hardcodear diccionarios de conversión de monedas históricas.
* **Renderizado y Paginación Dinámica:** Paginación gestionada íntegramente en el cliente, con un cálculo de elementos por página que reacciona dinámicamente al tamaño del viewport. Incluye inyección automática de separadores de sección al detectar cambios de agrupación (país o año).
* **Diseño Responsivo:** Interfaz adaptada a dispositivos móviles mediante CSS puro, forzando la reestructuración de la cuadrícula del formulario y la galería sin depender de frameworks externos.

## Requisitos Previos

* Python 3.8 o superior.
* Servidor de PostgreSQL.
* Credenciales de la API de Cloudinary.

## Configuración e Instalación

1. Clonar el repositorio.
2. Instalar las dependencias del proyecto:

```bash
   pip install -r requirements.txt
   ```

3. Crear un archivo `.env` en el directorio raíz con la siguiente estructura:

```text
   DATABASE\_URL=postgresql://usuario:password@host/nombre\_bd
   CLOUDINARY\_CLOUD\_NAME=tu\_cloud\_name
   CLOUDINARY\_API\_KEY=tu\_api\_key
   CLOUDINARY\_API\_SECRET=tu\_api\_secret
   SECRET\_TOKEN=contrasena\_acceso\_admin
   ```

## Ejecución en Entorno Local

Para levantar el servidor de desarrollo con recarga automática, ejecutar:

```bash
uvicorn main:app --reload
```

La aplicación se servirá por defecto en `http://localhost:8000`.

