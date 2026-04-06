from sqlalchemy.orm import Session
from . import models, schemas, auth

# Users
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Clients
def get_client(db: Session, client_id: int):
    return db.query(models.Client).filter(models.Client.id == client_id).first()

def get_clients(db: Session, user: schemas.User, skip: int = 0, limit: int = 100):
    if user.role == "admin":
        return db.query(models.Client).offset(skip).limit(limit).all()
    elif user.role == "customer":
        return db.query(models.Client).filter(models.Client.account_id == user.id).offset(skip).limit(limit).all()
    return db.query(models.Client).filter(models.Client.officer_id == user.id).offset(skip).limit(limit).all()

def create_client(db: Session, client: schemas.ClientCreate, officer_id: int):
    db_client = models.Client(**client.dict(), officer_id=officer_id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

# Loans
def get_loans(db: Session, user: schemas.User, skip: int = 0, limit: int = 100):
    if user.role == "admin":
        return db.query(models.Loan).offset(skip).limit(limit).all()
    elif user.role == "customer":
        return db.query(models.Loan).join(models.Client).filter(models.Client.account_id == user.id).offset(skip).limit(limit).all()
    return db.query(models.Loan).join(models.Client).filter(models.Client.officer_id == user.id).offset(skip).limit(limit).all()

def get_loans_by_client(db: Session, client_id: int):
    return db.query(models.Loan).filter(models.Loan.client_id == client_id).all()

def create_loan(db: Session, loan: schemas.LoanCreate, client_id: int):
    db_loan = models.Loan(**loan.dict())
    db_loan.client_id = client_id
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    return db_loan

def update_loan(db: Session, loan_id: int, loan_update: schemas.LoanUpdate):
    db_loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if db_loan:
        update_data = loan_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_loan, key, value)
        db.commit()
        db.refresh(db_loan)
    return db_loan
