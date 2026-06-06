from fastapi import APIRouter, Depends, HTTPException
from app.models.connection import get_db
from app.schemas.schemas import UserLogin, UserCreate
from app.models.models import Users
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix='/users')


@router.post('/reg')
async def registration(user : UserCreate, db : AsyncSession = Depends(get_db)):
    try:
        new_user = Users(user_name= user.name,
                     password= user.password)
        db.add(new_user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=404, detail='Пользователь уже существует')
    return {'message' : 'Успешная регистрация'}


@router.post('/login')
async def login(user : UserLogin, db : AsyncSession = Depends(get_db)):
    result = await db.execute(select(Users).where(Users.user_name == user.name, Users.password == user.password))
    request = result.scalar()
    if not request:
        raise HTTPException(status_code=404, detail='Неверный логин или пароль')
    return {'message' : 'Успешный вход'}