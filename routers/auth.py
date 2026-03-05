from fastapi import APIRouter, Depends, status, HTTPException, Response
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from MODELS.UserModel import UserModel
from SCHEMAS.UserSchema import UserSchema, Token
from database import get_db
import utils
import oauth

router = APIRouter(
    tags=["Authentication"]
)

# Login API

@router.post("/login", response_model=Token)
def login_user(user: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    # verify email
    data = db.query(UserModel).filter(UserModel.email == user.username).first()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials")

    # verify password
    passw = utils.verify(user.password, data.password)

    if not passw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Credentials")

    access_token = oauth.create_access_token(data={"user_id": data.id})
    return {"access_token": access_token, "token_type": "bearer"}