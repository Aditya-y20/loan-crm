from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, CheckConstraint
from sqlalchemy.orm import relationship
from .database import Base
from datetime import date, datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="customer")
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    
    loan_amount = Column(Float, nullable=True)
    rate = Column(Float, nullable=True)
    tenure = Column(Integer, nullable=True) # Months
    emi = Column(Float, nullable=True)
    credit_score = Column(Integer, nullable=True)
    loan_type = Column(String, nullable=True)
    
    lead_status = Column(String, default="new") # new, contacted, under_review, approved, disbursed, rejected
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

    officer = relationship("User", foreign_keys=[assigned_officer_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    loans = relationship("Loan", back_populates="lead")
    documents = relationship("Document", back_populates="lead")
    notifications = relationship("Notification", back_populates="lead")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    amount = Column(Float)
    status = Column(String, default="pending") # pending, active, closed
    interest_rate = Column(Float)
    tenure_months = Column(Integer)
    emi_amount = Column(Float)
    loan_type = Column(String)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", back_populates="loans")
    payments = relationship("Payment", back_populates="loan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    document_type = Column(String)
    file_path = Column(String, nullable=True)
    status = Column(String, default="missing") # missing, pending_verification, verified
    
    uploaded_at = Column(Date, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", back_populates="documents")
    uploader = relationship("User")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"))
    amount_due = Column(Float)
    amount_paid = Column(Float, default=0.0)
    due_date = Column(Date)
    paid_at = Column(Date, nullable=True)
    status = Column(String, default="pending") # pending, paid, late
    
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

    loan = relationship("Loan", back_populates="payments")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    message = Column(String)
    is_read = Column(Integer, default=0) # boolean via integer
    type = Column(
        String, 
        CheckConstraint("type IN ('info', 'warning', 'success', 'danger')"), 
        nullable=False
    )
    
    created_at = Column(Date, default=datetime.utcnow)
    updated_at = Column(Date, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", back_populates="notifications")
    user = relationship("User")
