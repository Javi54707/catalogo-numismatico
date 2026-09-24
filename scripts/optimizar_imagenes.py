import os
from PIL import Image

# Rutas relativas asumiendo que se ejecuta desde la raíz o desde /scripts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "assets", "raw_img")
OUT_DIR = os.path.join(BASE_DIR, "assets", "img")
MAX_SIZE = (800, 800) 

def procesar_imagenes():
    if not os.path.exists(RAW_DIR):
        print(f"La ruta {RAW_DIR} no existe.")
        return

    for archivo in os.listdir(RAW_DIR):
        if archivo.lower().endswith(('.png', '.jpg', '.jpeg')):
            ruta_in = os.path.join(RAW_DIR, archivo)
            nombre_base = os.path.splitext(archivo)[0]
            ruta_out = os.path.join(OUT_DIR, f"{nombre_base}.webp")

            if not os.path.exists(ruta_out):
                try:
                    img = Image.open(ruta_in)
                    img.thumbnail(MAX_SIZE)
                    img.save(ruta_out, "webp", quality=80)
                    print(f"✅ Optimizada: {nombre_base}.webp")
                except Exception as e:
                    print(f"❌ Error con {archivo}: {e}")

if __name__ == "__main__":
    print("Iniciando compresión...")
    procesar_imagenes()