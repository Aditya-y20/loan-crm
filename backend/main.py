from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from jose import JWTError, jwt

from . import models, schemas, crud, auth
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

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
        # Scaffold an empty client profile automatically linked to this account
        empty_client = models.Client(
            first_name=new_user.username, 
            last_name="(Customer)", 
            email=f"{new_user.username}@placeholder.com",
            account_id=new_user.id
        )
        db.add(empty_client)
        db.commit()
        
    return new_user

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

# Clients endpoints
@app.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Assign client to the creating officer or admin
    return crud.create_client(db=db, client=client, officer_id=current_user.id)

@app.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_clients(db, user=current_user, skip=skip, limit=limit)

@app.get("/clients/{client_id}", response_model=schemas.Client)
def read_client(client_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_client = crud.get_client(db, client_id=client_id)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client

# Loans endpoints
@app.post("/loans/", response_model=schemas.Loan)
def create_loan(loan: schemas.LoanCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    # Verify client exists
    db_client = crud.get_client(db, client_id=loan.client_id)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return crud.create_loan(db=db, loan=loan, client_id=loan.client_id)

@app.get("/loans/", response_model=List[schemas.Loan])
def read_loans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return crud.get_loans(db, user=current_user, skip=skip, limit=limit)

@app.put("/loans/{loan_id}", response_model=schemas.Loan)
def update_loan(loan_id: int, loan_update: schemas.LoanUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    db_loan = crud.update_loan(db, loan_id=loan_id, loan_update=loan_update)
    if db_loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    return db_loan
