from models import db, PendingUser, EmailVerification, RateLimitLog
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class CleanupService:
    @staticmethod
    def cleanup_expired_pending_users():
        """Remove expired pending users and their verification codes"""
        try:
            # Find expired pending users (older than 24 hours)
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            expired_pending_users = PendingUser.query.filter(
                PendingUser.created_at < cutoff_time
            ).all()
            
            count = len(expired_pending_users)
            
            # Delete expired users (cascade will delete verification codes)
            for user in expired_pending_users:
                db.session.delete(user)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} expired pending users")
            return count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during pending users cleanup: {str(e)}")
            return 0
    
    @staticmethod
    def cleanup_expired_verification_codes():
        """Remove expired verification codes"""
        try:
            expired_codes = EmailVerification.query.filter(
                EmailVerification.expires_at < datetime.utcnow(),
                EmailVerification.is_used == False
            ).all()
            
            count = len(expired_codes)
            
            for code in expired_codes:
                db.session.delete(code)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} expired verification codes")
            return count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during verification codes cleanup: {str(e)}")
            return 0
    
    @staticmethod
    def cleanup_rate_limit_logs():
        """Remove old rate limit logs (older than 1 hour)"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            old_logs = RateLimitLog.query.filter(
                RateLimitLog.attempt_time < cutoff_time
            )
            
            count = old_logs.count()
            old_logs.delete()
            
            db.session.commit()
            logger.info(f"Cleaned up {count} old rate limit logs")
            return count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during rate limit logs cleanup: {str(e)}")
            return 0
    
    @staticmethod
    def run_all_cleanup_tasks():
        """Run all cleanup tasks"""
        results = {
            'pending_users': CleanupService.cleanup_expired_pending_users(),
            'verification_codes': CleanupService.cleanup_expired_verification_codes(),
            'rate_limit_logs': CleanupService.cleanup_rate_limit_logs()
        }
        return results