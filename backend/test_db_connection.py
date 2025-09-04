import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

MYSQL_HOST = 'localhost'
MYSQL_USER = 'root'
MYSQL_PASSWORD = urllib.parse.quote_plus("Sahilkumar1272@#")  # encode special chars
MYSQL_DB = 'expense_tracker'

db_uri = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"

try:
    engine = create_engine(db_uri)
    with engine.connect() as connection:
        print("✅ Connection successful!")
        print("Database details:", connection.execute("SELECT DATABASE(), USER();").fetchone())
        
except OperationalError as e:
    print("❌ Connection failed!")
    print("Error:", e)

except Exception as e:
    print("❌ An unexpected error occurred!")
    print("Error:", e)
