import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("dharm.database")


def get_engine(db_url: str):
    # Normalize postgresql:// to postgresql+psycopg2:// for SQLAlchemy 2.0+
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False}
        )
    else:
        return create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )


try:
    engine = get_engine(settings.DATABASE_URL)
except Exception as e:
    logger.warning(f"Could not initialize engine for {settings.DATABASE_URL}: {e}. Falling back to SQLite.")
    engine = get_engine("sqlite:///./dharm.db")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sync_product_columns():
    """Ensure newly added columns exist in the database."""
    from sqlalchemy import text
    try:
        if str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(products)")
                cols = [r[1] for r in cursor.fetchall()]
                if cols:
                    if "barcode_format" not in cols:
                        cursor.execute("ALTER TABLE products ADD COLUMN barcode_format VARCHAR(50) DEFAULT 'CODE128'")
                    if "qr_code_url" not in cols:
                        cursor.execute("ALTER TABLE products ADD COLUMN qr_code_url VARCHAR(255)")
                    if "unit_weight" not in cols:
                        cursor.execute("ALTER TABLE products ADD COLUMN unit_weight FLOAT DEFAULT 1.0")
                    if "updated_at" not in cols:
                        cursor.execute("ALTER TABLE products ADD COLUMN updated_at TIMESTAMP")
                conn.connection.commit()
        else:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_format VARCHAR(50) DEFAULT 'CODE128'"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(255)"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_weight FLOAT DEFAULT 1.0"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
    except Exception as ex:
        logger.warning(f"Product column sync warning: {ex}")


def _sync_container_columns():
    """Ensure newly added columns exist in the containers table."""
    from sqlalchemy import text
    try:
        if str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(containers)")
                cols = [r[1] for r in cursor.fetchall()]
                if cols:
                    if "initialization_status" not in cols:
                        cursor.execute("ALTER TABLE containers ADD COLUMN initialization_status VARCHAR(50) DEFAULT 'Initialized'")
                    if "updated_at" not in cols:
                        cursor.execute("ALTER TABLE containers ADD COLUMN updated_at TIMESTAMP")
                conn.connection.commit()
        else:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE containers ADD COLUMN IF NOT EXISTS initialization_status VARCHAR(50) DEFAULT 'Initialized'"))
                conn.execute(text("ALTER TABLE containers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
    except Exception as ex:
        logger.warning(f"Container column sync warning: {ex}")


def _sync_shipment_columns():
    """Ensure newly added columns exist in the shipments table."""
    from sqlalchemy import text
    try:
        if str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(shipments)")
                cols = [r[1] for r in cursor.fetchall()]
                if cols and "manifest_locked" not in cols:
                    cursor.execute("ALTER TABLE shipments ADD COLUMN manifest_locked BOOLEAN DEFAULT 0")
                conn.connection.commit()
        else:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE shipments ADD COLUMN IF NOT EXISTS manifest_locked BOOLEAN DEFAULT FALSE"))
    except Exception as ex:
        logger.warning(f"Shipment column sync warning: {ex}")


def _sync_container_products_table():
    """Ensure container_products table exists."""
    from sqlalchemy import text
    try:
        if str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS container_products (
                        id VARCHAR(64) PRIMARY KEY,
                        container_id VARCHAR(64) NOT NULL,
                        product_id VARCHAR(64) NOT NULL,
                        product_name VARCHAR(255),
                        sku VARCHAR(100),
                        barcode VARCHAR(100),
                        quantity INTEGER DEFAULT 1 NOT NULL,
                        unit_weight FLOAT DEFAULT 1.0,
                        total_weight FLOAT DEFAULT 1.0,
                        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(container_id, product_id)
                    )
                """))
                conn.connection.commit()
        else:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS container_products (
                        id VARCHAR(64) PRIMARY KEY,
                        container_id VARCHAR(64) NOT NULL,
                        product_id VARCHAR(64) NOT NULL,
                        product_name VARCHAR(255),
                        sku VARCHAR(100),
                        barcode VARCHAR(100),
                        quantity INTEGER DEFAULT 1 NOT NULL,
                        unit_weight FLOAT DEFAULT 1.0,
                        total_weight FLOAT DEFAULT 1.0,
                        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_container_product UNIQUE (container_id, product_id)
                    )
                """))
    except Exception as ex:
        logger.warning(f"container_products table sync warning: {ex}")


def _sync_sqlite_columns():
    """Ensure all model columns exist in SQLite tables."""
    if not str(engine.url).startswith("sqlite"):
        return
    try:
        with engine.connect() as conn:
            cursor = conn.connection.cursor()
            for table_name, table in Base.metadata.tables.items():
                cursor.execute(f"PRAGMA table_info({table_name})")
                existing_cols = {row[1] for row in cursor.fetchall()}
                if not existing_cols:
                    continue
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}")
            conn.connection.commit()
    except Exception as ex:
        logger.warning(f"SQLite column auto-migration warning: {ex}")


def init_db():
    """Create all tables in the database and auto-migrate missing columns."""
    global engine, SessionLocal
    try:
        import app.models  # noqa: F401
        from sqlalchemy import text
        Base.metadata.create_all(bind=engine)
        _sync_product_columns()
        _sync_container_columns()
        _sync_shipment_columns()
        _sync_container_products_table()
        _sync_sqlite_columns()

        # Auto-migrate any newly added model columns to existing tables in PostgreSQL
        if not str(engine.url).startswith("sqlite"):
            try:
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
            except Exception as migrate_err:
                logger.warning(f"PostgreSQL column auto-migration warning: {migrate_err}")

        logger.info("Database tables and columns verified/created successfully.")
    except Exception as e:
        logger.warning(f"Error creating database tables with primary engine: {e}. Retrying with SQLite fallback.")
        engine = get_engine("sqlite:///./dharm.db")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        _sync_product_columns()
        _sync_container_columns()
        _sync_shipment_columns()
        _sync_container_products_table()
        _sync_sqlite_columns()
        logger.info("Database tables verified/created successfully in SQLite fallback.")


