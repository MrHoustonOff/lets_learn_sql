from contextlib import asynccontextmanager
from fastapi import FastAPI
from core import database, sqlite_db
from routes import query, explain, schema, tasks, databases, profile, courses

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database connection pools
    await sqlite_db.init_sqlite()
    await database.init_pools()
    yield
    # Shutdown: close connection pools
    await database.close_pools()
    await sqlite_db.close_sqlite()

app = FastAPI(
    title="PGym API",
    description="Backend for PGym - PostgreSQL practice platform",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "PGym Backend"}

# API Routes
app.include_router(query.router, prefix="/api", tags=["query"])
app.include_router(explain.router, prefix="/api", tags=["explain"])
app.include_router(schema.router, prefix="/api", tags=["schema"])
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
app.include_router(databases.router, prefix="/api", tags=["databases"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(courses.router, prefix="/api", tags=["courses"])
