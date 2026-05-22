from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.connection import get_db
from app.schemas.schemas import UserLogin, UserCreate
from app.models.models import Users
from sqlalchemy import select


router = APIRouter(prefix='/users')


@router.post('/reg')
def registration(user : UserCreate, db : Session = Depends(get_db)):
    try:
        new_user = Users(user_name= user.name,
                     password= user.password)
        db.add(new_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=404, detail='Пользователь уже существует')
    return {'message' : 'Успешная регистрация'}


@router.post('/login')
def login(user : UserLogin, db : Session = Depends(get_db)):
    request = db.execute(select(Users).where(Users.user_name == user.name, Users.password == user.password)).scalar()
    if not request:
        raise HTTPException(status_code=404, detail='Неверный логин или пароль')
    return {'message' : 'Успешный вход'}