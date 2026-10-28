from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.user import User, UserRoleEnum
from app.schemas.user import UserLogin, UserCreate, UserOut, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    email = None
    password = None

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")
    else:
        try:
            body = await request.json()
            if isinstance(body, dict):
                email = body.get("email") or body.get("username")
                password = body.get("password")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing email (or username) and password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = str(email).strip().lower()
    user = db.query(User).filter(User.email.ilike(email)).first()
    
    if not user or not verify_password(str(password), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value if hasattr(user.role, 'value') else str(user.role)}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    role_val = user_in.role.upper()
    if role_val not in [r.value for r in UserRoleEnum]:
        role_val = UserRoleEnum.OWNER.value

    new_user = User(
        id=f"usr-{uuid.uuid4().hex[:8]}",
        email=user_in.email.strip().lower(),
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        role=UserRoleEnum(role_val),
        organization=user_in.organization,
        avatar=user_in.avatar,
        location=user_in.location
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/demo-users")
def get_demo_users():
    """Return the demo accounts for rapid testing and development."""
    return [
        {
            "role": "OWNER",
            "name": "Dhruva (Owner)",
            "email": "hey.dhruvs20@gmail.com",
            "password": "Dharam@123",
            "organization": "Apex Global Logistics & Medical Supply",
            "location": "Central Distribution Center, Hub Alpha"
        },
        {
            "role": "VENDOR",
            "name": "Sinu Gunshetty",
            "email": "Sinugunshetty@gmail.com",
            "password": "Dharam@123",
            "organization": "Trans-Express Regional Logistics",
            "location": "Midwest Sorting & Cross-Dock Hub 4"
        },
        {
            "role": "CUSTOMER",
            "name": "Anusha S",
            "email": "anusha.s2028@gmail.com",
            "password": "Dharam@123",
            "organization": "BioMed Advanced Research Diagnostics",
            "location": "BioMed Campus Bay 2, Tech Park"
        }
    ]
