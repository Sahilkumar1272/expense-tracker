#!/usr/bin/env python3
"""
Cron job script for automated cleanup
Add this to your crontab to run every 30 minutes:
*/30 * * * * cd /path/to/your/backend && python scripts/cleanup_cron.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from utils.cleanup import CleanupService
import logging

# Setup logging for cron job
log_file = os.path.join(os.path.dirname(__file__), '..', 'logs', 'cleanup.log')
os.makedirs(os.path.dirname(log_file), exist_ok=True)

logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

def main():
    try:
        app = create_app()
        with app.app_context():
            results = CleanupService.run_all_cleanup_tasks()
            logging.info(f"Cleanup completed: {results}")
            print(f"Cleanup completed: {results}")
    except Exception as e:
        logging.error(f"Cleanup failed: {str(e)}")
        print(f"Cleanup failed: {str(e)}")

if __name__ == '__main__':
    main()