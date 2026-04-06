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

# Notifications
def generate_alert(db: Session, user_id: int, message: str, alert_type: str, lead_id: int = None):
    # Enforce CHECK constraint via python side mapping
    if alert_type not in ('info', 'warning', 'success', 'danger'):
        alert_type = 'info'
    notif = models.Notification(user_id=user_id, message=message, type=alert_type, lead_id=lead_id)
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

# Leads
def get_lead(db: Session, lead_id: int):
    return db.query(models.Lead).filter(models.Lead.id == lead_id).first()

def get_leads(db: Session, user: schemas.User, skip: int = 0, limit: int = 100):
    if user.role == "admin":
        return db.query(models.Lead).offset(skip).limit(limit).all()
    elif user.role == "customer":
        return db.query(models.Lead).filter(models.Lead.created_by_id == user.id).offset(skip).limit(limit).all()
    return db.query(models.Lead).filter(models.Lead.assigned_officer_id == user.id).offset(skip).limit(limit).all()

def create_lead(db: Session, lead: schemas.LeadCreate, created_by_id: int, assigned_officer_id: int = None):
    db_lead = models.Lead(**lead.dict(), created_by_id=created_by_id, assigned_officer_id=assigned_officer_id)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    
    # Auto notify assigned officer if applicable
    if assigned_officer_id:
        generate_alert(db, assigned_officer_id, f"You have been assigned a new prospect: {db_lead.first_name}", 'info', db_lead.id)
    return db_lead

# Loans
def get_loans(db: Session, user: schemas.User, skip: int = 0, limit: int = 100):
    if user.role == "admin":
        return db.query(models.Loan).offset(skip).limit(limit).all()
    elif user.role == "customer":
        return db.query(models.Loan).join(models.Lead).filter(models.Lead.created_by_id == user.id).offset(skip).limit(limit).all()
    return db.query(models.Loan).join(models.Lead).filter(models.Lead.assigned_officer_id == user.id).offset(skip).limit(limit).all()

def get_loans_by_lead(db: Session, lead_id: int):
    return db.query(models.Loan).filter(models.Loan.lead_id == lead_id).all()

def create_loan(db: Session, loan: schemas.LoanCreate):
    db_loan = models.Loan(**loan.dict())
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

# Documents
def create_document(db: Session, doc: schemas.DocumentCreate):
    db_doc = models.Document(**doc.dict())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Notify officer
    lead = get_lead(db, doc.lead_id)
    if lead and lead.assigned_officer_id:
        generate_alert(db, lead.assigned_officer_id, f"New document uploaded for Lead #{lead.id}", 'info', lead.id)
    return db_doc

# Payments
def get_payments(db: Session, user: schemas.User, skip: int = 0, limit: int = 100):
    if user.role == "admin":
        return db.query(models.Payment).offset(skip).limit(limit).all()
    elif user.role == "customer":
        return db.query(models.Payment).join(models.Loan).join(models.Lead).filter(models.Lead.created_by_id == user.id).offset(skip).limit(limit).all()
    return db.query(models.Payment).join(models.Loan).join(models.Lead).filter(models.Lead.assigned_officer_id == user.id).offset(skip).limit(limit).all()

def create_payment(db: Session, payment: schemas.PaymentCreate):
    from datetime import datetime
    db_payment = models.Payment(**payment.dict(), paid_at=datetime.utcnow().date())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    loan = db.query(models.Loan).filter(models.Loan.id == payment.loan_id).first()
    if loan and loan.lead and loan.lead.assigned_officer_id:
        generate_alert(db, loan.lead.assigned_officer_id, f"Payment recorded for Loan #{loan.id}", 'success', loan.lead_id)
    return db_payment
