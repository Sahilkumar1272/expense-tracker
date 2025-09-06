#!/usr/bin/env python3
"""
Database Cleanup Script for Testing
WARNING: This will delete ALL data from your database!
Use only in development/testing environment.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import urllib.parse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_database_config():
    """Get database configuration from environment variables"""
    mysql_host = os.environ.get('MYSQL_HOST', 'localhost')
    mysql_user = os.environ.get('MYSQL_USER', 'root')
    mysql_password = urllib.parse.quote_plus(os.environ.get('MYSQL_PASSWORD', 'Sahilkumar1272@#'))
    mysql_db = os.environ.get('MYSQL_DB', 'expense_tracker')
    
    return f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}/{mysql_db}"

def confirm_deletion():
    """Ask for user confirmation before proceeding"""
    print("⚠️  WARNING: This will delete ALL data from your database!")
    print("This action cannot be undone.")
    print("Only proceed if you're in a development/testing environment.")
    
    response = input("\nType 'DELETE ALL DATA' to confirm (case-sensitive): ")
    
    if response != "DELETE ALL DATA":
        print("❌ Operation cancelled.")
        return False
    
    return True

def clear_all_tables():
    """Clear all tables in the database"""
    if not confirm_deletion():
        return
    
    try:
        # Create database engine
        database_uri = get_database_config()
        engine = create_engine(database_uri)
        
        print("\n🔄 Connecting to database...")
        
        with engine.connect() as connection:
            # Get all table names
            result = connection.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            
            if not tables:
                print("✅ No tables found in database.")
                return
            
            print(f"📋 Found {len(tables)} tables: {', '.join(tables)}")
            
            # Disable foreign key checks to avoid constraint issues
            print("\n🔓 Disabling foreign key checks...")
            connection.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            # Drop each table
            print("\n🗑️  Dropping tables...")
            for table in tables:
                try:
                    connection.execute(text(f"DROP TABLE IF EXISTS `{table}`"))
                    print(f"   ✅ Dropped table: {table}")
                except SQLAlchemyError as e:
                    print(f"   ❌ Error dropping table {table}: {str(e)}")
            
            # Re-enable foreign key checks
            print("\n🔒 Re-enabling foreign key checks...")
            connection.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            
            # Commit the transaction
            connection.commit()
            
            print("\n✅ All tables have been successfully deleted!")
            print("💡 Remember to restart your Flask app to recreate the tables.")
            
    except SQLAlchemyError as e:
        print(f"\n❌ Database error: {str(e)}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        return False
    
    return True

def clear_specific_tables(table_list):
    """Clear only specific tables"""
    if not confirm_deletion():
        return
    
    try:
        database_uri = get_database_config()
        engine = create_engine(database_uri)
        
        print(f"\n🔄 Clearing specific tables: {', '.join(table_list)}")
        
        with engine.connect() as connection:
            # Disable foreign key checks
            connection.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            for table in table_list:
                try:
                    # Just clear data, don't drop table
                    connection.execute(text(f"DELETE FROM `{table}`"))
                    print(f"   ✅ Cleared data from: {table}")
                except SQLAlchemyError as e:
                    print(f"   ❌ Error clearing table {table}: {str(e)}")
            
            # Re-enable foreign key checks
            connection.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            connection.commit()
            
            print("\n✅ Selected tables have been cleared!")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False
    
    return True

def main():
    """Main function with menu options"""
    print("🗄️  Database Cleanup Tool")
    print("=" * 40)
    print("1. Delete ALL tables (complete reset)")
    print("2. Clear data from ALL tables (keep structure)")  
    print("3. Clear specific tables")
    print("4. Exit")
    
    choice = input("\nSelect an option (1-4): ")
    
    if choice == "1":
        clear_all_tables()
    elif choice == "2":
        # Clear data but keep table structure
        tables_to_clear = [
            "expenses", "categories", "users", "pending_users", 
            "email_verifications", "password_reset_tokens", "rate_limit_logs"
        ]
        clear_specific_tables(tables_to_clear)
    elif choice == "3":
        print("\nAvailable tables:")
        print("- expenses")
        print("- categories") 
        print("- users")
        print("- pending_users")
        print("- email_verifications")
        print("- password_reset_tokens")
        print("- rate_limit_logs")
        
        table_input = input("\nEnter table names separated by commas: ")
        tables = [t.strip() for t in table_input.split(",") if t.strip()]
        
        if tables:
            clear_specific_tables(tables)
        else:
            print("❌ No valid table names provided.")
    elif choice == "4":
        print("👋 Goodbye!")
    else:
        print("❌ Invalid option. Please choose 1-4.")

if __name__ == "__main__":
    main()