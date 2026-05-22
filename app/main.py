import json
import starlette.middleware.cors
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.routers.users import router as users_router
from app.routers.handlers import router
from app.models.models import Manga, Base
from app.models.connection import engine
from app.services.services import MEDIA_DIR

BASE_DIR = Path(__file__).parent.parent

app = FastAPI()

Base.metadata.create_all(bind=engine)

# синхронизируем папки с БД
with Session(engine) as db:
    folders = [f.name for f in MEDIA_DIR.iterdir() if f.is_dir()]
    for name in folders:
        info_file = MEDIA_DIR / name / 'info.json'
        genre = 'другое'
        if info_file.exists():
            genres = json.loads(info_file.read_text(encoding='utf-8')).get('genre', ['другое'])
            genre = ','.join(genres)
        exists = db.execute(select(Manga).where(Manga.name == name)).scalar()
        if not exists:
            db.add(Manga(name=name, genre=genre))
    db.commit()

app.add_middleware(
    starlette.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(users_router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/read/{manga}")
def read_page(manga: str):
    return FileResponse(BASE_DIR / "static" / "index.html")