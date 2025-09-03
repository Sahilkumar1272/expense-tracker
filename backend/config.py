import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "mysecret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost/expense_tracker")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
