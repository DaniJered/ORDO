import os
import hashlib
import uuid
from typing import Protocol, Tuple, Optional

class StorageBackend(Protocol):
    def save_file(self, content: bytes, original_filename: str) -> Tuple[str, str, int]:
        """Saves file content. Returns (file_path, sha256_hash, file_size)."""
        ...
        
    def get_file(self, file_path: str) -> Optional[bytes]:
        ...
        
    def delete_file(self, file_path: str) -> bool:
        ...

class LocalStorageBackend:
    def __init__(self, base_dir: Optional[str] = None):
        if not base_dir:
            self.base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
        else:
            self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, content: bytes, original_filename: str) -> Tuple[str, str, int]:
        sha256_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)
        
        # Prevent collision and directory traversal
        ext = os.path.splitext(original_filename)[1].lower()[:10]
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = os.path.join(self.base_dir, safe_filename)
        
        with open(target_path, "wb") as f:
            f.write(content)
            
        return target_path, sha256_hash, file_size

    def get_file(self, file_path: str) -> Optional[bytes]:
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return f.read()
        return None

    def delete_file(self, file_path: str) -> bool:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except OSError:
                return False
        return False

# Stubs for Cloud Object Stores (§12)
class S3StorageBackend:
    """Stubbed S3 cloud storage adapter for AWS S3 deployment."""
    def save_file(self, content: bytes, original_filename: str) -> Tuple[str, str, int]:
        raise NotImplementedError("S3 storage adapter available in cloud deployment tier.")

class GCSStorageBackend:
    """Stubbed Google Cloud Storage adapter."""
    def save_file(self, content: bytes, original_filename: str) -> Tuple[str, str, int]:
        raise NotImplementedError("GCS storage adapter available in cloud deployment tier.")

storage_service = LocalStorageBackend()

