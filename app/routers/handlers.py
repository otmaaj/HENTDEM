from fastapi import APIRouter, HTTPException, Depends, Query
from app.services.services import get_manga_list, get_pages, get_photo, get_genre_list
from app.models.connection import Session, get_db
from app.models.models import Manga, Favourites, Users
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/manga")

@router.get('/search')
def check(q: str = None, genre : list[str] = Query(default=[])):
    manga = get_manga_list()
    if q:
        manga = [f for f in manga if q.lower() in f.lower()]
    if genre:
        manga = [
            m for m in manga
            if all(tag in get_genre_list(m) for tag in genre)
        ]
    return {'manga': manga}


@router.get('/')
def manga_list(db: Session = Depends(get_db)):
    mangas = db.execute(select(Manga)).scalars().all()
    if not mangas:
        raise HTTPException(status_code=404, detail="Манга не найдена")
    res = []
    for manga in mangas:
        photo = get_photo(manga.name)
        res.append({"name": manga.name,"genre": manga.genre,"photo": photo})
    return {"manga": res}


@router.post('/add')
def add(manga_name: str, user_name: str, db : Session = Depends(get_db)):
    manga = db.execute(select(Manga).where(Manga.name == manga_name)).scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    user = db.execute(select(Users).where(Users.user_name == user_name)).scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    try:
        db.add(Favourites(manga_id=manga.id, user_id=user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail='манга уже добавлена в избранное')
    return {'message': 'Манга добавлена в избранное'}


@router.get('/fav_list')
def get_favourite_list(user_name : str, db : Session = Depends(get_db)):
    user = db.execute(select(Users).where(Users.user_name == user_name)).scalar()
    if not user:
        HTTPException(status_code=404, detail='войдите в аккаунт')
    favourites = db.execute(select(Favourites).where(Favourites.user_id == user.id)).scalars().all()
    if not favourites:
        raise HTTPException(status_code=404, detail='Тут пока пусто')
    manga_ids = [f.manga_id for f in favourites]
    mangas = db.execute(select(Manga).where(Manga.id.in_(manga_ids))).scalars().all()
    res = []
    for manga in mangas:
        photo = get_photo(manga.name)
        res.append({"name": manga.name, "genre": manga.genre, "photo": photo})
    return {"manga": res}


@router.post('/fav_del')
def delete_favourite(user_name : str, manga_name: str, db : Session = Depends(get_db)):
    user = db.execute(select(Users).where(Users.user_name == user_name)).scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    manga = db.execute(select(Manga).where(Manga.name == manga_name)).scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    fav = db.execute(
        select(Favourites).where(Favourites.user_id == user.id, Favourites.manga_id == manga.id)
    ).scalar()
    if not fav:
        raise HTTPException(status_code=404, detail='нет в избранном')
    db.delete(fav)
    db.commit()
    return {'message': 'удалено из избранного'}


@router.get('/{manga}')
def pages(manga: str):
    result = get_pages(manga)
    if result is None:
        raise HTTPException(status_code=404, detail="Ошибка сервера")
    return {"manga": manga, "pages": result}