import os
import json
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# --- NUEVAS IMPORTACIONES CLOUDINARY ---
import cloudinary
import cloudinary.uploader

import models
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

load_dotenv()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

# --- CONFIGURACIÓN DE CLOUDINARY ---
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure = True
)

app = FastAPI(title="API Catálogo Numismático")

from fastapi.responses import Response

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Dibujamos un SVG de una moneda dorada al vuelo
    svg_content = """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#C5B79F" stroke="#8c7a6b" stroke-width="4"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#8c7a6b" stroke-width="2" stroke-dasharray="4 4"/>
        <text x="50" y="68" font-family="Georgia, serif" font-size="50" font-weight="bold" fill="#6d5f4d" text-anchor="middle">N</text>
    </svg>
    """
    return Response(content=svg_content, media_type="image/svg+xml")

@app.get("/manifest.json", include_in_schema=False)
async def get_manifest():
    return {
        "name": "Catálogo Numismático",
        "short_name": "Numismática",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#FCFBF9",
        "theme_color": "#6d5f4d",
        "icons": [
            {
                "src": "/favicon.ico",
                "sizes": "512x512",
                "type": "image/svg+xml"
            }
        ]
    }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def db_a_json(pieza):
    return {
        "id": pieza.id, "tipo": pieza.tipo,
        "identificacion": {
            "pais": pieza.pais, "epoca": pieza.epoca, "valor_facial": pieza.valor_facial,
            "ano_visible": pieza.ano_visible, "ceca": pieza.ceca, "motivo": pieza.motivo, "fecha_emision": pieza.fecha_emision
        },
        "tecnica": {
            "material": pieza.material, "peso_g": pieza.peso_g,
            "diametro_mm": pieza.diametro_mm, "dimensiones": pieza.dimensiones, "numero_serie": pieza.numero_serie
        },
        "coleccionismo": { "estado": pieza.estado },
        "adquisicion": { "precio_eur": pieza.precio_eur },
        "multimedia": { "img_anverso": pieza.img_anverso, "img_reverso": pieza.img_reverso },
        "notas": pieza.notas
    }

def json_a_db(item: dict):
    return models.Pieza(
        id=item.get("id"), tipo=item.get("tipo"),
        pais=item.get("identificacion", {}).get("pais"), epoca=item.get("identificacion", {}).get("epoca"),
        valor_facial=item.get("identificacion", {}).get("valor_facial"), ano_visible=item.get("identificacion", {}).get("ano_visible"),
        ceca=item.get("identificacion", {}).get("ceca"), motivo=item.get("identificacion", {}).get("motivo"),
        fecha_emision=item.get("identificacion", {}).get("fecha_emision"),
        material=item.get("tecnica", {}).get("material"), peso_g=item.get("tecnica", {}).get("peso_g"),
        diametro_mm=item.get("tecnica", {}).get("diametro_mm"), 
        dimensiones=item.get("tecnica", {}).get("dimensiones"),
        numero_serie=item.get("tecnica", {}).get("numero_serie"),
        estado=item.get("coleccionismo", {}).get("estado"), precio_eur=item.get("adquisicion", {}).get("precio_eur", 0.0),
        img_anverso=item.get("multimedia", {}).get("img_anverso"), img_reverso=item.get("multimedia", {}).get("img_reverso"),
        notas=item.get("notas")
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except:
        raise HTTPException(status_code=401, detail="Sesión inválida o caducada")

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
def login(req: LoginRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    expiracion = datetime.now(timezone.utc) + timedelta(hours=8)
    token = jwt.encode({"sub": "admin", "exp": expiracion}, JWT_SECRET, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/piezas")
def obtener_catalogo(db: Session = Depends(get_db)):
    # Al usar JSONB, SQLAlchemy devuelve el diccionario perfecto automáticamente
    piezas = db.query(models.Pieza).all()
    return piezas

# --- EL NUEVO ENDPOINT DE LA NUBE ---
@app.post("/api/upload-imagen")
async def subir_imagen(file: UploadFile = File(...), token: dict = Depends(verificar_token)):
    try:
        # Leemos los datos binarios de la imagen
        content = await file.read()
        
        # Se los enviamos a Cloudinary pidiendo compresión al vuelo
        resultado = cloudinary.uploader.upload(
            content,
            folder="catalogo_numismatico", # Crea una carpeta en tu nube
            format="webp",                 # Lo pasa a WebP
            transformation=[
                {"width": 800, "crop": "limit"} # Lo redimensiona si es muy grande
            ]
        )
        
        # Devolvemos la URL segura (https) que nos da Cloudinary
        return {"ruta_generada": resultado.get("secure_url")}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/piezas")
async def crear_pieza(pieza_dict: dict, db: Session = Depends(get_db), token: dict = Depends(verificar_token)):
    # Comprobar si existe
    existente = db.query(models.Pieza).filter(models.Pieza.id == pieza_dict["id"]).first()
    if existente:
        raise HTTPException(status_code=400, detail="El ID ya existe")

    # Inyección directa de los bloques JSON
    nueva_pieza = models.Pieza(
        id=pieza_dict["id"],
        tipo=pieza_dict["tipo"],
        notas=pieza_dict.get("notas", ""),
        identificacion=pieza_dict.get("identificacion", {}),
        tecnica=pieza_dict.get("tecnica", {}),
        coleccionismo=pieza_dict.get("coleccionismo", {}),
        adquisicion=pieza_dict.get("adquisicion", {}),
        multimedia=pieza_dict.get("multimedia", {})
    )
    
    db.add(nueva_pieza)
    db.commit()
    return {"mensaje": "Pieza guardada correctamente"}

@app.put("/api/piezas/{pieza_id}")
async def actualizar_pieza(pieza_id: str, pieza_dict: dict, db: Session = Depends(get_db), token: dict = Depends(verificar_token)):
    existente = db.query(models.Pieza).filter(models.Pieza.id == pieza_id).first()
    if not existente:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    
    # Actualizamos los campos directamente
    existente.tipo = pieza_dict["tipo"]
    existente.notas = pieza_dict.get("notas", "")
    existente.identificacion = pieza_dict.get("identificacion", {})
    existente.tecnica = pieza_dict.get("tecnica", {})
    existente.coleccionismo = pieza_dict.get("coleccionismo", {})
    existente.adquisicion = pieza_dict.get("adquisicion", {})
    existente.multimedia = pieza_dict.get("multimedia", {})
    
    db.commit()
    return {"mensaje": "Pieza actualizada correctamente"}

# --- FUNCIÓN AUXILIAR PARA BORRAR DE LA NUBE ---
def borrar_imagen_cloudinary(url: str):
    # Si no hay imagen o es una ruta local antigua (./assets...), no hacemos nada
    if not url or "cloudinary.com" not in url:
        return 
    try:
        # La URL tiene este formato: .../image/upload/v1234567/catalogo_numismatico/nombre.webp
        # Extraemos solo la parte final "catalogo_numismatico/nombre"
        ruta = url.split("/upload/")[1]
        if ruta.startswith("v") and "/" in ruta:
            ruta = ruta.split("/", 1)[1] # Quitamos el número de versión
        public_id = ruta.rsplit(".", 1)[0] # Quitamos la extensión .webp
        
        # Enviamos la orden de destrucción a los servidores de Cloudinary
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Error al limpiar Cloudinary: {e}")

# --- ENDPOINT DE BORRADO ACTUALIZADO ---
@app.delete("/api/monedas/{item_id}")
@app.delete("/api/billetes/{item_id}")
async def eliminar_pieza(item_id: str, db: Session = Depends(get_db), token: dict = Depends(verificar_token)):
    pieza = db.query(models.Pieza).filter(models.Pieza.id == item_id).first()
    if not pieza:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    
    # 1. Destruimos las imágenes en la nube de forma SEGURA
    try:
        if pieza.img_anverso:
            borrar_imagen_cloudinary(pieza.img_anverso)
        if pieza.img_reverso:
            borrar_imagen_cloudinary(pieza.img_reverso)
    except Exception as e:
        print(f"Aviso: Fallo al borrar imagen en Cloudinary para {item_id}: {e}")
        # No bloqueamos el borrado de la base de datos si Cloudinary falla
    
    # 2. Borramos el registro de la base de datos local
    try:
        db.delete(pieza)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno al borrar en la base de datos")
        
    return {"mensaje": "Pieza eliminada correctamente"}

@app.on_event("startup")
def migrar_datos_antiguos():
    db = SessionLocal()
    if db.query(models.Pieza).count() == 0:
        try:
            with open("data/monedas.json", "r", encoding="utf-8") as f:
                for m in json.load(f): db.add(json_a_db(m))
            with open("data/billetes.json", "r", encoding="utf-8") as f:
                for b in json.load(f): db.add(json_a_db(b))
            db.commit()
        except: pass
    db.close()

app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

@app.get("/")
def ruta_principal():
    return FileResponse("index.html")