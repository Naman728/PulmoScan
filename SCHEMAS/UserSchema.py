from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# -------- Base --------
class UserSchema(BaseModel):
    email: str
    role: str


# -------- Create --------
class UserCreate(UserSchema):
    email: str
    password: str


# -------- Response --------
class UserResponse(UserSchema):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    id: Optional[str] = None
    role: Optional[str] = None

    class Config:
        from_attributes = True