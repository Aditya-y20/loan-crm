from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from .database import Base
from datetime import date

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="customer")

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    address = Column(String)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    loans = relationship("Loan", back_populates="owner")
    officer = relationship("User", foreign_keys=[officer_id])
    account = relationship("User", foreign_keys=[account_id])

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    status = Column(String, default="pending") # pending, active, closed
    interest_rate = Column(Float)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date)
    client_id = Column(Integer, ForeignKey("clients.id"))

    owner = relationship("Client", back_populates="loans")
