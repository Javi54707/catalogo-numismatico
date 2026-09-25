from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Le decimos que cree un archivo numismatica.db en la raíz
SQLALCHEMY_DATABASE_URL = "sqlite:///./numismatica.db"

# Para SQLite en FastAPI es obligatorio este connect_args
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()