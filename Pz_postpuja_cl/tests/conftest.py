"""Las pruebas usan mongomock (una MongoDB falsa en memoria), como el catálogo."""
from unittest.mock import patch

import mongomock
import pytest

cliente_falso = mongomock.MongoClient()

with patch("pymongo.MongoClient", return_value=cliente_falso):
    from src.infrastructure.db import mongo  # noqa: E402

mongo.crear_indices()


@pytest.fixture(autouse=True)
def base_limpia():
    mongo.entregas_collection.delete_many({})
    yield
