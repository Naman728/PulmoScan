from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import status, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from MODELS.UserModel import UserModel
from SCHEMAS.UserSchema import TokenData

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


oauth2_scheme = OAuth2PasswordBearer(tokenUrl = 'login')


def create_access_token(data : dict):

    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode , SECRET_KEY , algorithm = ALGORITHM)
    return encoded_jwt


def verify_access_token(token : str , crendentials_exception):
    try:
        payload = jwt.decode(token , SECRET_KEY , algorithms= [ALGORITHM])
        id = payload.get("user_id")
        role = payload.get("role")

        if id is None:
            raise crendentials_exception
        
        token_data = TokenData(id=id, role=role)
    except JWTError:
        raise crendentials_exception
    
    return token_data
        

def get_current_user(token : str = Depends(oauth2_scheme) , db : Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code = status.HTTP_401_UNAUTHORIZED , detail = "could not validate credentials" , headers = {"WWW-Authenticate" : "Bearer"})
    token = verify_access_token(token , crendentials_exception)
    data = db.query(UserModel).filter(UserModel.id == token.id).first()
    return data


def require_role(required_role: str):
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        return current_user
    return role_checker


