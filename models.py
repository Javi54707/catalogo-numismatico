from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from database import Base # O de donde importes tu Base

class Pieza(Base):
    __tablename__ = "piezas"

    # Columnas estándar para búsquedas básicas y relaciones
    id = Column(String, primary_key=True, index=True)
    tipo = Column(String, index=True) # 'moneda' o 'billete'
    notas = Column(Text, nullable=True)

    # Columnas JSONB para toda la información flexible
    identificacion = Column(JSONB, default={})
    tecnica = Column(JSONB, default={})
    coleccionismo = Column(JSONB, default={})
    adquisicion = Column(JSONB, default={})
    multimedia = Column(JSONB, default={})