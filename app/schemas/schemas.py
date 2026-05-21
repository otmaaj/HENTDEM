from pydantic import field_validator, BaseModel


class UserCreate(BaseModel):
    name : str
    password : str

    @field_validator('name')
    @classmethod
    def valid_name(cls, v :str) -> str:
        s = v.strip()
        if len(s) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(s) > 28:
            raise ValueError('Имя пользователя слишком длинное')
        return s

    @field_validator('password')
    @classmethod
    def valid_pass(cls , v : str) -> str:
        s = v.strip()
        if len(s) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        return s

class UserLogin(BaseModel):
    name: str
    password: str