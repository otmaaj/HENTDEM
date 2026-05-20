from sqlalchemy import create_engine
from app.database import settings
from sqlalchemy.orm import Session

engine = create_engine(url=settings.bd_url, echo=True, connect_args={"options": "-c client_encoding=utf8"})


def get_db():
    with Session(engine) as f:
        yield f