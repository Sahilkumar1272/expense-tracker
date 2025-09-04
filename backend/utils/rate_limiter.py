from functools import wraps
from flask import request, jsonify
from models import db, RateLimitLog
from datetime import datetime, timedelta

def rate_limit(max_attempts, window_hours=1, endpoint_name=None):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            if ip_address:
                ip_address = ip_address.split(',')[0].strip()
            
            endpoint = endpoint_name or request.endpoint
            
            # Count attempts in the time window
            cutoff_time = datetime.utcnow() - timedelta(hours=window_hours)
            recent_attempts = RateLimitLog.query.filter(
                RateLimitLog.ip_address == ip_address,
                RateLimitLog.endpoint == endpoint,
                RateLimitLog.attempt_time > cutoff_time
            ).count()
            
            if recent_attempts >= max_attempts:
                return jsonify({
                    'error': f'Rate limit exceeded. Maximum {max_attempts} attempts per {window_hours} hour(s). Please try again later.'
                }), 429
            
            # Log this attempt
            log_entry = RateLimitLog(
                ip_address=ip_address,
                endpoint=endpoint
            )
            db.session.add(log_entry)
            db.session.commit()
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator