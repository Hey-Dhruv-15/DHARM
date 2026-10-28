import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("dharm.database")

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables in the database and auto-migrate missing columns."""
    try:
        # Import all models here so that Base.metadata has registered them
        import app.models  # noqa: F401
        from sqlalchemy import text
        Base.metadata.create_all(bind=engine)

        # Auto-migrate any newly added model columns to existing tables
        with engine.begin() as conn:
            for table_name, table in Base.metadata.tables.items():
                res = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = :tname AND table_schema = 'public'"
                ), {"tname": table_name})
                existing_cols = {row[0] for row in res.fetchall()}

                if not existing_cols:
                    continue

                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        nullable = "NULL" if col.nullable else "NOT NULL DEFAULT ''"
                        conn.execute(text(
                            f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {col_type} {nullable};'
                        ))

        logger.info("Database tables and columns verified/created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise e
