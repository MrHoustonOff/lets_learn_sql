import os
import sys
from unittest.mock import AsyncMock

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

# Override SQLite DB path to use a test database before importing main
os.environ["SQLITE_DB_PATH"] = "data/test_app.db"

# Mock PostgreSQL initialization to prevent connection hangs during local tests
import core.database
core.database.init_pools = AsyncMock()
core.database.close_pools = AsyncMock()

from main import app

@pytest.fixture(scope="session")
def client():
    """
    Provides a TestClient.
    Using 'with TestClient(app)' automatically triggers the FastAPI lifespan,
    initializing the DB connection and running migrations on the test DB.
    """
    with TestClient(app) as c:
        yield c
