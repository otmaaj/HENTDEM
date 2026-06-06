from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import settings

engine = create_async_engine(url=settings.bd_url, echo=True, connect_args={"options": "-c client_encoding=utf8"})

AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as f:
        yield f