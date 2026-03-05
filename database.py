from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False) #this is a session factory that will be used to get the database session

Base = declarative_base() #this is a base class that will be used to create the database models 

#this is a dependency function that will be used to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()