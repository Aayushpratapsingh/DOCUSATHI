from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.models.entities import User

hasher = PasswordHasher()
bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return hasher.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    try: return hasher.verify(hashed, password)
    except VerifyMismatchError: return False

def make_token(user_id: int) -> str:
    return jwt.encode({"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(days=1)}, settings.jwt_secret, algorithm="HS256")

async def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: AsyncSession = Depends(get_db)) -> User:
    if not credentials: raise HTTPException(401, "Please log in to continue")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except Exception: raise HTTPException(401, "Session expired. Please log in again")
    user = await db.get(User, user_id)
    if not user: raise HTTPException(401, "Account not found")
    return user
