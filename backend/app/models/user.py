from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum
import enum
from app.database import Base


class UserRoleEnum(str, enum.Enum):
    OWNER = "OWNER"
    VENDOR = "VENDOR"
    CUSTOMER = "CUSTOMER"


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.OWNER)
    organization = Column(String(255), nullable=False)
    avatar = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
