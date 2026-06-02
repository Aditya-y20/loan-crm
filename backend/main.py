from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from jose import JWTError, jwt
import os
import uuid
import shutil

from . import models, schemas, crud, auth
from .database import SessionLocal, engine

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Loan CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Seed admin user
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auto-seed first admin on startup
with SessionLocal() as db:
    if not db.query(models.User).filter(models.User.role == "admin").first():
        hashed_password = auth.get_password_hash("admin")
        admin_user = models.User(username="admin", hashed_password=hashed_password, role="admin")
        db.add(admin_user)
        db.commit()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

@app.get("/")
def read_root():
    return {"message": "LendCRM Backend is running. Access the API docs at /docs"}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = crud.create_user(db=db, user=user)
    
    if new_user.role == "customer":
        empty_lead = models.Lead(
            first_name=new_user.username, 
            last_name="(Customer)", 
            email=f"{new_user.username}@placeholder.com",
            created_by_id=new_user.id
        )
        db.add(empty_lead)
        db.commit()
        
    return new_user

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

# Leads endpoints
@app.post("/leads/", response_model=schemas.Lead)
def create_lead(lead: schemas.LeadCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.create_lead(db=db, lead=lead, created_by_id=current_user.id, assigned_officer_id=current_user.id)

@app.get("/leads/", response_model=List[schemas.Lead])
def read_leads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_leads(db, user=current_user, skip=skip, limit=limit)

@app.get("/leads/{lead_id}", response_model=schemas.Lead)
def read_lead(lead_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_lead = crud.get_lead(db, lead_id=lead_id)
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return db_lead

@app.patch("/leads/{lead_id}/status", response_model=schemas.Lead)
def update_lead_status(lead_id: int, status_update: dict, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    new_status = status_update.get("lead_status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing lead_status in payload")
    
    db_lead = crud.get_lead(db, lead_id=lead_id)
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Transactional logic for Approval -> Loan generation
    if new_status == "approved" and db_lead.lead_status != "approved":
        if "loan_amount" in status_update:
            db_lead.loan_amount = float(status_update["loan_amount"])
        if "rate" in status_update:
            db_lead.rate = float(status_update["rate"])
        if "tenure" in status_update:
            db_lead.tenure = int(status_update["tenure"])
        if "emi" in status_update:
            db_lead.emi = float(status_update["emi"])
            
        # Pre-validation constraint before mutating
        if db_lead.loan_amount is None or db_lead.rate is None or db_lead.tenure is None or db_lead.emi is None:
            raise HTTPException(
                status_code=400, 
                detail="Cannot approve lead. Missing financial parameters (loan_amount, rate, tenure, emi). Please run calculator first."
            )
            
        try:
            # Spawn Loan
            new_loan = models.Loan(
                lead_id=db_lead.id,
                amount=db_lead.loan_amount,
                interest_rate=db_lead.rate,
                tenure_months=db_lead.tenure,
                emi_amount=db_lead.emi,
                loan_type=db_lead.loan_type or "standard",
                status="active"
            )
            db.add(new_loan)
            
            db_lead.lead_status = "approved"
            db.commit()
            db.refresh(db_lead)
            
            crud.generate_alert(db, current_user.id, f"Lead #{db_lead.id} approved and Loan generated.", "success", lead_id=db_lead.id)
            return db_lead
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Database transaction failed during loan generation.")
            
    # Default non-approval status update
    db_lead.lead_status = new_status
    db.commit()
    db.refresh(db_lead)
    return db_lead

# Documents endpoints
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"]

@app.post("/documents/upload", response_model=schemas.Document)
async def upload_document(
    lead_id: int = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and PDF are allowed.")
        
    # Check bounds
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
        
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    safe_filename = f"{uuid.uuid4()}.{ext}"
    physical_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(physical_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not securely write file to disk.")
        
    # Scaffold Document
    doc_create = schemas.DocumentCreate(
        lead_id=lead_id,
        document_type=document_type,
        file_path=safe_filename
    )
    db_doc = crud.create_document(db=db, doc=doc_create)
    
    db_doc.uploaded_by = current_user.id
    db_doc.status = "uploaded"
    db.commit()
    db.refresh(db_doc)
    
    return db_doc

# Loans & Payments endpoints
@app.get("/loans/", response_model=List[schemas.Loan])
def read_loans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_loans(db, user=current_user, skip=skip, limit=limit)

@app.post("/payments/record", response_model=schemas.Payment)
def record_payment(payment: schemas.PaymentCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.create_payment(db=db, payment=payment)
