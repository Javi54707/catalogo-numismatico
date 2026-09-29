from sqlalchemy import Column, String, Integer, Float, Text
from database import Base

class Pieza(Base):
    __tablename__ = "piezas"

    # Datos base
    id = Column(String, primary_key=True, index=True)
    tipo = Column(String, index=True)  # "moneda" o "billete"
    
    # Identificación
    pais = Column(String, default="Desconocido")
    epoca = Column(String, default="Sin especificar")
    valor_facial = Column(String, nullable=False)
    ano_visible = Column(Integer, nullable=True)
    ceca = Column(String, default="Sin especificar")
    
    # Específico de billetes
    motivo = Column(String, nullable=True)
    fecha_emision = Column(String, nullable=True)
    
    # Técnica
    material = Column(String, default="Desconocido")
    peso_g = Column(Float, nullable=True)
    diametro_mm = Column(Float, nullable=True)
    dimensiones = Column(String, nullable=True)
    numero_serie = Column(String, nullable=True)
    
    # Coleccionismo y Adquisición
    estado = Column(String, default="MBC")
    precio_eur = Column(Float, default=0.0)
    
    # Multimedia
    img_anverso = Column(String, nullable=True)
    img_reverso = Column(String, nullable=True)
    
    notas = Column(Text, nullable=True)