from models import db, PendingUser, EmailVerification, PasswordResetToken, RateLimitLog
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class CleanupService:
    @staticmethod
    def cleanup_expired_pending_users():
        try:
            expiration_time = datetime.utcnow() - timedelta(hours=24)
            expired_users = PendingUser.query.filter(PendingUser.created_at < expiration_time).all()
            count = len(expired_users)
            
            for user in expired_users:
                EmailVerification.query.filter_by(pending_user_id=user.id).delete()
                db.session.delete(user)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} expired pending users")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up pending users: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_expired_verification_codes():
        try:
            expired_codes = EmailVerification.query.filter(
                EmailVerification.expires_at < datetime.utcnow()
            ).all()
            count = len(expired_codes)
            
            for code in expired_codes:
                db.session.delete(code)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} expired verification codes")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up verification codes: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_expired_reset_tokens():
        try:
            expired_tokens = PasswordResetToken.query.filter(
                PasswordResetToken.expires_at < datetime.utcnow()
            ).all()
            count = len(expired_tokens)
            
            for token in expired_tokens:
                db.session.delete(token)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} expired password reset tokens")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up reset tokens: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_old_rate_limit_logs():
        try:
            expiration_time = datetime.utcnow() - timedelta(days=1)
            old_logs = RateLimitLog.query.filter(RateLimitLog.attempt_time < expiration_time).all()
            count = len(old_logs)
            
            for log in old_logs:
                db.session.delete(log)
            
            db.session.commit()
            logger.info(f"Cleaned up {count} old rate limit logs")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up rate limit logs: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def run_all_cleanup_tasks():
        results = {
            'pending_users': CleanupService.cleanup_expired_pending_users(),
            'verification_codes': CleanupService.cleanup_expired_verification_codes(),
            'reset_tokens': CleanupService.cleanup_expired_reset_tokens(),
            'rate_limit_logs': CleanupService.cleanup_old_rate_limit_logs()
        }
        return results