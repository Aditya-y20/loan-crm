from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "customer"

class User(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Loan Schemas
class LoanBase(BaseModel):
    amount: float
    status: str = "pending"
    interest_rate: float
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class LoanCreate(LoanBase):
    client_id: int

class LoanUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[float] = None
    interest_rate: Optional[float] = None

class Loan(LoanBase):
    id: int
    client_id: int

    class Config:
        from_attributes = True

# Client Schemas
class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    officer_id: Optional[int] = None
    account_id: Optional[int] = None
    loans: List[Loan] = []

    class Config:
        from_attributes = True
