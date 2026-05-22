from pydantic import field_validator, BaseModel

class UserCreate(BaseModel):
    name : str
    password : str

    @field_validator('name')
    @classmethod
    def valid_name(cls, v :str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(v) > 28:
            raise ValueError('Имя пользователя слишком длинное')
        return v


    @field_validator('password')
    @classmethod
    def valid_pass(cls , v : str) -> str:
        v = v.strip()
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')

        allowed = set(
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:'\",.<>/?\\|`~")

        if not all(char in allowed for char in v):
            raise ValueError('Пароль содержит недопустимые символы (только латиница, цифры и спецсимволы)')
        return v



class UserLogin(BaseModel):
    name: str
    password: str