"""
Migration script to update database schema for the new security implementation
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, User, PendingUser, EmailVerification, RateLimitLog
from datetime import datetime

def migrate_database():
    """Run database migration"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create new tables
            print("Creating new tables...")
            db.create_all()
            print("New tables created successfully!")
            
            # If you have existing unverified users, you might want to migrate them
            unverified_users = User.query.filter_by(is_verified=False).all()
            if unverified_users:
                print(f"Found {len(unverified_users)} unverified users.")
                response = input("Do you want to delete them? (y/n): ")
                if response.lower() == 'y':
                    for user in unverified_users:
                        db.session.delete(user)
                    db.session.commit()
                    print(f"Deleted {len(unverified_users)} unverified users.")
            
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    migrate_database()