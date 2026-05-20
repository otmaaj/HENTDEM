from pydantic_settings import SettingsConfigDict, BaseSettings
from pathlib import Path

class DB(BaseSettings):
    NAME : str
    PASS : str
    HOST : str
    USER : str
    PORT : int

    @property
    def bd_url(self):
        return f'postgresql+psycopg://{self.USER}:{self.PASS}@{self.HOST}:{self.PORT}/{self.NAME}?client_encoding=utf8'
    model_config = SettingsConfigDict(env_file=Path(__file__).parent.parent / '.env')
settings = DB()