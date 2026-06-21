import json
from contextlib import asynccontextmanager
from pathlib import Path

import anyio
import starlette.middleware.cors
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.routers.users import router as users_router
from app.routers.handlers import router
from app.models.models import Manga, Base, Favourites, Users
from app.models.connection import engine, AsyncSessionLocal
from app.services.services import MEDIA_DIR

BASE_DIR = Path(__file__).parent.parent


def sync_folders():
    folders_data = []
    if not MEDIA_DIR.exists():
        return folders_data
    for f in MEDIA_DIR.iterdir():
        if f.is_dir():
            name = f.name
            info_file = MEDIA_DIR / name / 'info.json'
            genre = 'другое'
            if info_file.exists():
                try:
                    genres = json.loads(info_file.read_text(encoding='utf-8')).get('genre', ['другое'])
                    genre = ','.join(genres)
                except Exception:
                    pass
            folders_data.append((name, genre))
    return folders_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    folders = await anyio.to_thread.run_sync(sync_folders)

    async with AsyncSessionLocal() as db:
        for name, genre in folders:
            result = await db.execute(select(Manga).where(Manga.name == name))
            exists = result.scalar()
            if not exists:
                db.add(Manga(name=name, genre=genre))
        await db.commit()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    starlette.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(users_router)
@app.get("/hKiPz3.js")
async def get_service_worker():
    return FileResponse(BASE_DIR / "static" / "js" / "hKiPz3.js", media_type="application/javascript")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/favorites")
async def favorites_page():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/read/{manga}")
async def read_page(manga: str):
    return FileResponse(BASE_DIR / "static" / "index.html")

