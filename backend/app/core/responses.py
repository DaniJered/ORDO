from typing import Any, Optional
from pydantic import BaseModel

class APIError(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class APIMeta(BaseModel):
    page: Optional[int] = 1
    page_size: Optional[int] = 50
    total: Optional[int] = None

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[APIError] = None
    meta: Optional[APIMeta] = None

def success_response(data: Any = None, meta: Optional[dict] = None) -> dict:
    resp = {"success": True, "data": data, "error": None}
    if meta is not None:
        resp["meta"] = meta
    return resp

def error_response(code: str, message: str, details: Any = None) -> dict:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details
        }
    }

