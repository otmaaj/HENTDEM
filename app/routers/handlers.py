from fastapi import APIRouter, HTTPException, Depends, Query
from app.services.services import get_manga_list, get_pages, get_photo, get_genre_list
from app.models.connection import get_db
from app.models.models import Manga, Favourites, Users, Likes
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/manga")

@router.get('/search')
async def check(q: str = None, genre: list[str] = Query(default=[])):
    manga = get_manga_list()
    if q:
        manga = [f for f in manga if q.lower() in f.lower()]
    if genre:
        manga = [m for m in manga if all(tag in get_genre_list(m) for tag in genre)]
    return {'manga': manga}


@router.get('/')
async def manga_list(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Manga))
    mangas = result.scalars().all()
    if not mangas:
        raise HTTPException(status_code=404, detail="Манга не найдена")
    res = []
    for manga in mangas:
        photo = get_photo(manga.name)
        result_likes = await db.execute(select(Likes).where(Likes.manga_id == manga.id))
        likes_count = len(result_likes.scalars().all())
        res.append({"name": manga.name, "genre": manga.genre, "photo": photo, "views": manga.views, "likes": likes_count,"pages_count": len(get_pages(manga.name)),})
    return {"manga": res}

@router.post('/add')
async def add(manga_name: str, user_name: str, db: AsyncSession = Depends(get_db)):
    result_manga = await db.execute(select(Manga).where(Manga.name == manga_name))
    manga = result_manga.scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    result_user = await db.execute(select(Users).where(Users.user_name == user_name))
    user = result_user.scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    try:
        db.add(Favourites(manga_id=manga.id, user_id=user.id))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail='манга уже добавлена в избранное')
    return {'message': 'Манга добавлена в избранное'}


@router.get('/fav_list')
async def get_favourite_list(user_name: str, db: AsyncSession = Depends(get_db)):
    result_user = await db.execute(select(Users).where(Users.user_name == user_name))
    user = result_user.scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    result_fav = await db.execute(select(Favourites).where(Favourites.user_id == user.id))
    favourites = result_fav.scalars().all()
    if not favourites:
        raise HTTPException(status_code=404, detail='Тут пока пусто')
    manga_ids = [f.manga_id for f in favourites]
    result_manga = await db.execute(select(Manga).where(Manga.id.in_(manga_ids)))
    mangas = result_manga.scalars().all()
    res = []
    for manga in mangas:
        photo = get_photo(manga.name)
        res.append({"name": manga.name, "genre": manga.genre, "photo": photo})
    return {"manga": res}


@router.post('/fav_del')
async def delete_favourite(user_name: str, manga_name: str, db: AsyncSession = Depends(get_db)):
    result_user = await db.execute(select(Users).where(Users.user_name == user_name))
    user = result_user.scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    result_manga = await db.execute(select(Manga).where(Manga.name == manga_name))
    manga = result_manga.scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    result_fav = await db.execute(
        select(Favourites).where(Favourites.user_id == user.id, Favourites.manga_id == manga.id)
    )
    fav = result_fav.scalar()
    if not fav:
        raise HTTPException(status_code=404, detail='нет в избранном')
    await db.delete(fav)
    await db.commit()
    return {'message': 'удалено из избранного'}


@router.post('/like')
async def like_manga(manga_name: str, user_name: str, db: AsyncSession = Depends(get_db)):
    result_manga = await db.execute(select(Manga).where(Manga.name == manga_name))
    manga = result_manga.scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    result_user = await db.execute(select(Users).where(Users.user_name == user_name))
    user = result_user.scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    try:
        db.add(Likes(manga_id=manga.id, user_id=user.id))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail='уже лайкнуто')
    result = await db.execute(select(Likes).where(Likes.manga_id == manga.id))
    count = len(result.scalars().all())
    return {'likes': count}


@router.post('/like_del')
async def unlike_manga(manga_name: str, user_name: str, db: AsyncSession = Depends(get_db)):
    result_user = await db.execute(select(Users).where(Users.user_name == user_name))
    user = result_user.scalar()
    if not user:
        raise HTTPException(status_code=404, detail='войдите в аккаунт')
    result_manga = await db.execute(select(Manga).where(Manga.name == manga_name))
    manga = result_manga.scalar()
    if not manga:
        raise HTTPException(status_code=404, detail='манга не найдена')
    result_like = await db.execute(select(Likes).where(Likes.user_id == user.id, Likes.manga_id == manga.id))
    like = result_like.scalar()
    if not like:
        raise HTTPException(status_code=404, detail='лайк не найден')
    await db.delete(like)
    await db.commit()
    result = await db.execute(select(Likes).where(Likes.manga_id == manga.id))
    count = len(result.scalars().all())
    return {'likes': count}


@router.get('/{manga}')
async def pages(manga: str, db: AsyncSession = Depends(get_db)):
    result_manga = await db.execute(select(Manga).where(Manga.name == manga))
    manga_obj = result_manga.scalar()
    if manga_obj:
        manga_obj.views += 1
        await db.commit()
    result = get_pages(manga)
    if not result:
        raise HTTPException(status_code=404, detail="Ошибка сервера")
    return {"manga": manga, "pages": result, "views": manga_obj.views if manga_obj else 0}