from models import db, PendingUser, EmailVerification, PasswordResetToken, RateLimitLog, Expense, Category, User
from datetime import datetime, timedelta
import logging
from config import Config

logger = logging.getLogger(__name__)

class CleanupService:
    @staticmethod
    def cleanup_expired_pending_users():
        """Remove expired pending users and their verification codes"""
        try:
            expiration_time = datetime.utcnow() - timedelta(hours=Config.PENDING_USER_EXPIRY_HOURS)
            count = PendingUser.query.filter(PendingUser.created_at < expiration_time).delete()
            # Verification codes are automatically deleted via cascade in models.py
            db.session.commit()
            logger.info(f"Cleaned up {count} expired pending users")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up pending users: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_expired_verification_codes():
        """Remove expired email verification codes"""
        try:
            count = EmailVerification.query.filter(
                EmailVerification.expires_at < datetime.utcnow()
            ).delete()
            db.session.commit()
            logger.info(f"Cleaned up {count} expired verification codes")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up verification codes: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_expired_reset_tokens():
        """Remove expired or used password reset tokens"""
        try:
            count = PasswordResetToken.query.filter(
                (PasswordResetToken.expires_at < datetime.utcnow()) | 
                (PasswordResetToken.is_used == True)
            ).delete()
            db.session.commit()
            logger.info(f"Cleaned up {count} expired or used password reset tokens")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up reset tokens: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_old_rate_limit_logs():
        """Remove rate limit logs older than 1 day"""
        try:
            expiration_time = datetime.utcnow() - timedelta(days=1)
            count = RateLimitLog.query.filter(RateLimitLog.attempt_time < expiration_time).delete()
            db.session.commit()
            logger.info(f"Cleaned up {count} old rate limit logs")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up rate limit logs: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_orphaned_expenses():
        """Remove expenses with non-existent users"""
        try:
            count = Expense.query.filter(~Expense.user_id.in_(
                db.session.query(User.id)
            )).delete(synchronize_session=False)
            db.session.commit()
            logger.info(f"Cleaned up {count} orphaned expenses")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up orphaned expenses: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def cleanup_orphaned_categories():
        """Remove user-specific categories with non-existent users (preserve default categories)"""
        try:
            # Only delete categories that have a user_id (not default categories) 
            # AND where that user no longer exists
            count = Category.query.filter(
                Category.user_id.isnot(None),  # Only check user-specific categories
                ~Category.user_id.in_(db.session.query(User.id))  # User doesn't exist
            ).delete(synchronize_session=False)
            db.session.commit()
            logger.info(f"Cleaned up {count} orphaned categories")
            return count
        except Exception as e:
            logger.error(f"Error cleaning up orphaned categories: {str(e)}")
            db.session.rollback()
            return 0

    @staticmethod
    def run_all_cleanup_tasks():
        """Run all cleanup tasks and return results"""
        try:
            results = {
                'pending_users': CleanupService.cleanup_expired_pending_users(),
                'verification_codes': CleanupService.cleanup_expired_verification_codes(),
                'reset_tokens': CleanupService.cleanup_expired_reset_tokens(),
                'rate_limit_logs': CleanupService.cleanup_old_rate_limit_logs(),
                'orphaned_expenses': CleanupService.cleanup_orphaned_expenses(),
                'orphaned_categories': CleanupService.cleanup_orphaned_categories()
            }
            logger.info(f"Cleanup results: {results}")
            return results
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            db.session.rollback()
            raise