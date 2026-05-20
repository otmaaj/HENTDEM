from fastapi import APIRouter, HTTPException, Depends
from app.services.services import get_manga_list, get_pages, get_photo
from app.shemas import Session, get_db
from app.models.models import Manga
from sqlalchemy import select

router = APIRouter(prefix="/manga")


@router.get('/search')
def check(q: str = None):
    manga = get_manga_list()
    if q:
        manga = [f for f in manga if q.lower() in f.lower()]
    return {'manga': manga}


@router.get('/')
def manga_list(db: Session = Depends(get_db)):
    mangas = db.execute(select(Manga)).scalars().all()
    if not mangas:
        raise HTTPException(status_code=404, detail="Манга не найдена")
    res = []
    for manga in mangas:
        photo = get_photo(manga.name)
        res.append({
            "name": manga.name,
            "genre": manga.genre,
            "photo": photo
        })
    return {"manga": res}


@router.get('/{manga}')
def pages(manga: str):
    result = get_pages(manga)
    if result is None:
        raise HTTPException(status_code=404, detail="Ошибка сервера")
    return {"manga": manga, "pages": result}