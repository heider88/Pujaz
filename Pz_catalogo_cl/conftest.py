import mongomock
from unittest.mock import patch

mock_client = mongomock.MongoClient()

# Patch it before any test module is loaded
patcher = patch('pymongo.MongoClient', return_value=mock_client)
patcher.start()
