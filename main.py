from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from PIL import Image
import json
import os

app = FastAPI(title="API Catálogo Numismático")

# 1. Endpoints de lectura (GET)
@app.get("/api/monedas")
def obtener_monedas():
    with open("data/monedas.json", "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/billetes")
def obtener_billetes():
    with open("data/billetes.json", "r", encoding="utf-8") as f:
        return json.load(f)

# 2. Endpoint de escritura y procesamiento (POST)
@app.post("/api/upload-imagen")
async def subir_imagen(file: UploadFile = File(...)):
    # Guardar la imagen original temporalmente en raw_img
    ruta_temp = f"assets/raw_img/{file.filename}"
    with open(ruta_temp, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Procesar y comprimir a WebP
    nombre_base = os.path.splitext(file.filename)[0]
    ruta_out = f"assets/img/{nombre_base}.webp"
    
    try:
        img = Image.open(ruta_temp)
        img.thumbnail((800, 800))
        img.save(ruta_out, "webp", quality=80)
        return {
            "mensaje": "Imagen procesada y optimizada con éxito", 
            "ruta_generada": f"./assets/img/{nombre_base}.webp"
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/monedas")
async def guardar_moneda(moneda: dict):
    with open("data/monedas.json", "r", encoding="utf-8") as f:
        datos = json.load(f)
    
    datos.append(moneda)
    
    with open("data/monedas.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)
        
    return {"mensaje": "Moneda registrada correctamente"}

# 3. Servir el Frontend
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
def ruta_principal():
    return FileResponse("index.html")