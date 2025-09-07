from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Expense, Category
from utils.rate_limiter import rate_limit
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_
import logging
from datetime import datetime, timedelta

expense_bp = Blueprint('expense', __name__)
logger = logging.getLogger(__name__)

# ---------------------- EXPENSES ----------------------

@expense_bp.route('/expenses', methods=['POST'])
@jwt_required()
@rate_limit(limit=120, period=3600)
def add_expense():
    try:
        user_id = get_jwt_identity()
        logger.info(f"Add expense request from user {user_id}")
        
        # Check if request has JSON data
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        if data.get('amount') is None or data.get('amount') == '':
            return jsonify({'error': 'Amount is required'}), 400

        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Amount must be a valid number'}), 400

        # Validate type
        expense_type = data.get('type', 'expense')
        if expense_type not in ['expense', 'income']:
            expense_type = 'expense'

        # Validate category if provided
        category_id = data.get('category_id')
        if category_id:
            category = Category.query.filter(
                (Category.id == category_id) &
                ((Category.user_id == user_id) | (Category.is_default == True)) &
                (Category.type == expense_type)  # Category type must match expense type
            ).first()
            if not category:
                return jsonify({'error': 'Invalid category for this transaction type'}), 400

        # Get payment mode, default to 'cash' if not provided
        payment_mode = data.get('payment_mode', 'cash')
        
        # Validate payment mode
        valid_payment_modes = ['cash', 'debit_card', 'credit_card', 'upi', 'net_banking']
        if payment_mode not in valid_payment_modes:
            payment_mode = 'cash'  # Default to cash if invalid

        # Handle date
        expense_date = datetime.utcnow()
        if data.get('date'):
            try:
                # Handle both ISO format and ISO format with Z
                date_str = data['date'].replace('Z', '+00:00')
                expense_date = datetime.fromisoformat(date_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400

        new_expense = Expense(
            user_id=user_id,
            type=expense_type,  # Add type field
            description=data.get('description', ''),  # Optional field
            amount=amount,
            category_id=category_id,
            payment_mode=payment_mode,
            date=expense_date
        )

        db.session.add(new_expense)
        db.session.commit()

        logger.info(f"Transaction added for user {user_id}")
        return jsonify({
            'message': 'Transaction added successfully',
            'expense': new_expense.to_dict()
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error adding expense: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error adding expense: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@expense_bp.route('/expenses', methods=['GET'])
@jwt_required()
@rate_limit(limit=150, period=3600)
def get_expenses():
    try:
        user_id = get_jwt_identity()
        logger.info(f"Get expenses request from user {user_id}")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 15, type=int)
        
        # Get filter parameters - handle multiple values
        expense_types = request.args.getlist('type')  # Changed from get to getlist
        category_ids = request.args.getlist('category_id')  # Changed from get to getlist
        payment_modes = request.args.getlist('payment_mode')  # Changed from get to getlist
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build base query
        query = Expense.query.filter_by(user_id=user_id)
        
        # Apply filters - handle multiple values with IN clause
        if expense_types:
            query = query.filter(Expense.type.in_(expense_types))  # Use IN for multiple values
        
        if category_ids:
            # Convert string IDs to integers
            category_ids = [int(cid) for cid in category_ids if cid.isdigit()]
            if category_ids:
                query = query.filter(Expense.category_id.in_(category_ids))
        
        if payment_modes:
            query = query.filter(Expense.payment_mode.in_(payment_modes))  # Use IN for multiple values
        
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Expense.date >= start, Expense.date <= end)
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination and ordering
        expenses = query.order_by(Expense.date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        logger.info(f"Found {total} expenses for user {user_id}, showing page {page}")
        
        # Process each expense with individual error handling
        expense_list = []
        for exp in expenses.items:
            try:
                expense_dict = exp.to_dict()
                expense_list.append(expense_dict)
                logger.debug(f"Successfully serialized expense {exp.id}")
            except Exception as e:
                logger.error(f"Error serializing expense {exp.id}: {str(e)}")
                # Skip this expense but continue processing others
                continue
        
        logger.info(f"Successfully serialized {len(expense_list)} expenses")
        return jsonify({
            'expenses': expense_list,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': expenses.pages
        }), 200

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching expenses: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching expenses: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500
    

@expense_bp.route('/expenses/<int:id>', methods=['PUT'])
@jwt_required()
@rate_limit(limit=20, period=3600)
def update_expense(id):
    try:
        user_id = get_jwt_identity()
        expense = Expense.query.filter_by(id=id, user_id=user_id).first()

        if not expense:
            return jsonify({'error': 'Transaction not found'}), 404

        data = request.get_json()

        # Update type if provided
        if 'type' in data:
            expense_type = data['type']
            if expense_type in ['expense', 'income']:
                expense.type = expense_type

        if 'description' in data:
            expense.description = data['description']
        if data.get('amount'):
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return jsonify({'error': 'Amount must be positive'}), 400
                expense.amount = amount
            except (ValueError, TypeError):
                return jsonify({'error': 'Amount must be a valid number'}), 400
        if 'category_id' in data:
            category_id = data['category_id']
            if category_id:
                category = Category.query.filter(
                    (Category.id == category_id) &
                    ((Category.user_id == user_id) | (Category.is_default == True)) &
                    (Category.type == expense.type)  # Category type must match expense type
                ).first()
                if not category:
                    return jsonify({'error': 'Invalid category for this transaction type'}), 400
            expense.category_id = category_id
        if 'payment_mode' in data:
            # Validate payment mode
            valid_payment_modes = ['cash', 'debit_card', 'credit_card', 'upi', 'net_banking']
            if data['payment_mode'] in valid_payment_modes:
                expense.payment_mode = data['payment_mode']
        if data.get('date'):
            try:
                date_str = data['date'].replace('Z', '+00:00')
                expense.date = datetime.fromisoformat(date_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400

        db.session.commit()

        logger.info(f"Transaction {id} updated for user {user_id}")
        return jsonify({
            'message': 'Transaction updated successfully',
            'expense': expense.to_dict()
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error updating expense: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error updating expense: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


@expense_bp.route('/expenses/<int:id>', methods=['DELETE'])
@jwt_required()
@rate_limit(limit=20, period=3600)
def delete_expense(id):
    try:
        user_id = get_jwt_identity()
        expense = Expense.query.filter_by(id=id, user_id=user_id).first()

        if not expense:
            return jsonify({'error': 'Transaction not found'}), 404

        db.session.delete(expense)
        db.session.commit()

        logger.info(f"Transaction {id} deleted for user {user_id}")
        return jsonify({'message': 'Transaction deleted successfully'}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error deleting expense: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error deleting expense: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

# ---------------------- CATEGORIES ----------------------

@expense_bp.route('/expenses/categories', methods=['POST'])
@jwt_required()
@rate_limit(limit=10, period=3600)
def add_category():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data or not data.get('name'):
            return jsonify({'error': 'Name is required'}), 400

        # Set default type if not provided
        category_type = data.get('type', 'expense')
        if category_type not in ['expense', 'income']:
            category_type = 'expense'

        # Prevent duplicate names for this user, including defaults
        existing_category = Category.query.filter(
            Category.name == data['name'],
            Category.type == category_type,
            or_(Category.user_id == user_id, Category.is_default == True)
        ).first()
        if existing_category:
            return jsonify({'error': 'Category already exists for this type'}), 400

        new_category = Category(
            user_id=user_id,
            name=data['name'],
            type=category_type,
            is_default=False
        )

        db.session.add(new_category)
        db.session.commit()

        logger.info(f"Category added for user {user_id}")
        return jsonify({
            'message': 'Category added successfully',
            'category': new_category.to_dict()
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error adding category: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error adding category: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500


@expense_bp.route('/expenses/categories', methods=['GET'])
@jwt_required()
@rate_limit(limit=150, period=3600)
def get_categories():
    try:
        user_id = get_jwt_identity()
        categories = Category.query.filter(
            (Category.user_id == user_id) | (Category.is_default == True)
        ).order_by(Category.name).all()

        # Deduplicate by name and type (case insensitive), preferring user-specific
        seen = {}
        for cat in categories:
            key = (cat.name.lower(), cat.type)
            if key not in seen or (cat.user_id == user_id and seen[key].user_id != user_id):
                seen[key] = cat

        unique_categories = list(seen.values())
        unique_categories.sort(key=lambda c: c.name)

        return jsonify({'categories': [cat.to_dict() for cat in unique_categories]}), 200

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching categories: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching categories: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

# ---------------------- DEBUG ENDPOINTS ----------------------

@expense_bp.route('/debug/category/<int:category_id>', methods=['GET'])
@jwt_required()
def debug_category(category_id):
    try:
        user_id = get_jwt_identity()
        
        # Check if category exists at all
        category_exists = Category.query.filter_by(id=category_id).first()
        
        # Check if category matches the validation logic
        category_valid = Category.query.filter(
            (Category.id == category_id) &
            ((Category.user_id == user_id) | (Category.is_default == True))
        ).first()
        
        # Get all categories for this user
        all_user_categories = Category.query.filter(
            (Category.user_id == user_id) | (Category.is_default == True)
        ).all()
        
        return jsonify({
            'user_id': user_id,
            'requested_category_id': category_id,
            'category_exists': category_exists.to_dict() if category_exists else None,
            'category_valid': category_valid.to_dict() if category_valid else None,
            'all_available_categories': [c.to_dict() for c in all_user_categories]
        })
    except Exception as e:
        logger.error(f"Debug category error: {str(e)}")
        return jsonify({'error': str(e)}), 500