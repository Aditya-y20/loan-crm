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
    created_at: date
    updated_at: date

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Notification Schemas
class NotificationBase(BaseModel):
    message: str
    type: str

class NotificationCreate(NotificationBase):
    lead_id: Optional[int] = None
    user_id: int

class Notification(NotificationBase):
    id: int
    is_read: int
    lead_id: Optional[int] = None
    user_id: int
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    amount_due: float
    amount_paid: float = 0.0
    due_date: date
    status: str = "pending"

class PaymentCreate(PaymentBase):
    loan_id: int
    
class Payment(PaymentBase):
    id: int
    loan_id: int
    paid_at: Optional[date] = None
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True

# Document Schemas
class DocumentBase(BaseModel):
    document_type: str
    status: str = "missing"
    
class DocumentCreate(DocumentBase):
    lead_id: int
    file_path: Optional[str] = None
    
class Document(DocumentBase):
    id: int
    lead_id: int
    file_path: Optional[str] = None
    uploaded_at: Optional[date] = None
    uploaded_by: Optional[int] = None
    created_at: date
    updated_at: date
    
    class Config:
        from_attributes = True

# Loan Schemas
class LoanBase(BaseModel):
    amount: float
    interest_rate: float
    tenure_months: int
    emi_amount: float
    loan_type: str
    status: str = "pending"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class LoanCreate(LoanBase):
    lead_id: int

class LoanUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[float] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    emi_amount: Optional[float] = None

class Loan(LoanBase):
    id: int
    lead_id: int
    created_at: date
    updated_at: date
    payments: List[Payment] = []

    class Config:
        from_attributes = True

# Lead Schemas (formerly Client)
class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    
    loan_amount: Optional[float] = None
    rate: Optional[float] = None
    tenure: Optional[int] = None
    emi: Optional[float] = None
    credit_score: Optional[int] = None
    loan_type: Optional[str] = None
    
    lead_status: str = "new"

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    id: int
    assigned_officer_id: Optional[int] = None
    created_by_id: Optional[int] = None
    created_at: date
    updated_at: date
    
    loans: List[Loan] = []
    documents: List[Document] = []
    notifications: List[Notification] = []

    class Config:
        from_attributes = True

