from sqlalchemy import String, ForeignKey , UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Manga(Base):
    __tablename__ = 'manga'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    genre: Mapped[str] = mapped_column(String(256), default='другое')


class Users(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    password: Mapped[str] = mapped_column(String)
    user_name:Mapped[str] = mapped_column(String(64), unique=True)


class Favourites(Base):
    __tablename__ = "favourites"

    id : Mapped[int] = mapped_column(primary_key=True)
    manga_id : Mapped[int] = mapped_column(ForeignKey('manga.id'))
    user_id : Mapped[int] = mapped_column(ForeignKey('users.id'))

    __table_args__ = (UniqueConstraint('manga_id','user_id'), )