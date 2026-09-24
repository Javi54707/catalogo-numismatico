# Catálogo Numismático

Repositorio de datos estructurados para la gestión, catalogación y control de inventario de una colección numismática y notafílica.

Este proyecto sustituye las hojas de cálculo convencionales por una arquitectura basada en archivos JSON, permitiendo un tipado de datos estricto, control de versiones semántico y sentando las bases para una futura integración con interfaces web o análisis de datos.

## Arquitectura de Datos

La base de datos se estructura en entidades lógicas independientes para mantener la cohesión de los esquemas:

* `data/monedas.json`: Registros con atributos físicos y de acuñación (peso, aleación, diámetro, ceca, conservación).
* `data/billetes.json`: Registros enfocados en variables notafílicas (números de serie, firmas, planchas, emisiones).

## Pipeline de Procesamiento de Imágenes

Para optimizar el rendimiento del repositorio y evitar la subida de archivos binarios pesados al control de versiones, los recursos fotográficos originales en alta resolución se excluyen sistemáticamente mediante `.gitignore`. 

El repositorio incluye un script de automatización en Python que procesa las imágenes en crudo, aplicando un redimensionamiento y compresión iterativa hacia el formato WebP.

### Instrucciones de ejecución

1. Depositar las fotografías originales (`.jpg`, `.png`) en el directorio local no rastreado: `assets/raw_img/`.
2. Instalar las dependencias del entorno:
   pip install Pillow
3. Ejecutar el procesador:
    python scripts/optimizar_imagenes.py
4. Las versiones .webp optimizadas se generarán en el directorio público assets/img/, listas para ser referenciadas en los esquemas JSON y versionadas en Git.

## Stack Tecnológico
Almacenamiento de Datos: JSON
Automatización de Assets: Python 3 (Pillow)
Control de Versiones: Git & GitHub