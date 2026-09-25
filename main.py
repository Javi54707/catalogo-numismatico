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
            "diametro_mm": pieza.diametro_mm, "numero_serie": pieza.numero_serie
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
        diametro_mm=item.get("tecnica", {}).get("diametro_mm"), numero_serie=item.get("tecnica", {}).get("numero_serie"),
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

@app.get("/api/monedas")
def obtener_monedas(db: Session = Depends(get_db)):
    piezas = db.query(models.Pieza).filter(models.Pieza.tipo == "moneda").all()
    return [db_a_json(p) for p in piezas]

@app.get("/api/billetes")
def obtener_billetes(db: Session = Depends(get_db)):
    piezas = db.query(models.Pieza).filter(models.Pieza.tipo == "billete").all()
    return [db_a_json(p) for p in piezas]


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


@app.post("/api/monedas")
async def guardar_moneda(moneda: dict, db: Session = Depends(get_db), token: dict = Depends(verificar_token)):
    nueva_pieza = json_a_db(moneda)
    existente = db.query(models.Pieza).filter(models.Pieza.id == nueva_pieza.id).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una pieza con ese ID")
    db.add(nueva_pieza)
    db.commit()
    return {"mensaje": "Pieza guardada en la base de datos"}

@app.delete("/api/monedas/{item_id}")
@app.delete("/api/billetes/{item_id}")
async def eliminar_pieza(item_id: str, db: Session = Depends(get_db), token: dict = Depends(verificar_token)):
    pieza = db.query(models.Pieza).filter(models.Pieza.id == item_id).first()
    if not pieza:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")
    db.delete(pieza)
    db.commit()
    return {"mensaje": "Pieza eliminada de la base de datos"}

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
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
def ruta_principal():
    return FileResponse("index.html")