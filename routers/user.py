from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from SCHEMAS.UserSchema import UserCreate, UserResponse
from fastapi.security import OAuth2PasswordRequestForm
import utils
from database import get_db
from MODELS.UserModel import UserModel
import oauth


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):

    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    hashed_password = utils.hash(user.password)

    new_user = UserModel(
        email=user.email,
        password=hashed_password,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(oauth.get_current_user)):
    return current_user
