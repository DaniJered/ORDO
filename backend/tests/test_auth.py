import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token

def test_password_hashing():
    pwd = "SecretPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert "$" in hashed
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    user_id = "user-1234"
    role = "coordinator"
    token = create_access_token(user_id, role)
    assert isinstance(token, str)
    
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == role
    assert payload["type"] == "access"

def test_invalid_token():
    assert decode_token("invalid.token.string") is None

