from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Expense, Category
from utils.rate_limiter import rate_limit
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime

expense_bp = Blueprint('expense', __name__)
logger = logging.getLogger(__name__)

# ---------------------- EXPENSES ----------------------

@expense_bp.route('/expenses', methods=['POST'])
@jwt_required()
@rate_limit(limit=20, period=3600)
def add_expense():
    try:
        user_id = get_jwt_identity()
        logger.info(f"Add expense request from user {user_id}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Request data: {request.get_data()}")
        
        data = request.get_json()
        logger.info(f"Parsed JSON: {data}")
        
        # Check if request has JSON data
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        if not data.get('description'):
            return jsonify({'error': 'Description is required'}), 400
            
        if data.get('amount') is None or data.get('amount') == '':
            return jsonify({'error': 'Amount is required'}), 400

        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Amount must be a valid number'}), 400

        # Validate category if provided
        category_id = data.get('category_id')
        if category_id:
            category = Category.query.filter(
                (Category.id == category_id) &
                ((Category.user_id == user_id) | (Category.is_default == True))
            ).first()
            if not category:
                return jsonify({'error': 'Invalid category'}), 400

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
            description=data['description'],
            amount=amount,
            category_id=category_id,
            date=expense_date
        )

        db.session.add(new_expense)
        db.session.commit()

        logger.info(f"Expense added for user {user_id}")
        return jsonify({'expense': new_expense.to_dict()}), 201

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
@rate_limit(limit=50, period=3600)
def get_expenses():
    try:
        user_id = get_jwt_identity()
        logger.info(f"Get expenses request from user {user_id}")
        
        expenses = Expense.query.filter_by(user_id=user_id).order_by(Expense.date.desc()).all()
        logger.info(f"Found {len(expenses)} expenses for user {user_id}")
        
        # Process each expense with individual error handling
        expense_list = []
        for exp in expenses:
            try:
                expense_dict = exp.to_dict()
                expense_list.append(expense_dict)
                logger.debug(f"Successfully serialized expense {exp.id}")
            except Exception as e:
                logger.error(f"Error serializing expense {exp.id}: {str(e)}")
                # Skip this expense but continue processing others
                continue
        
        logger.info(f"Successfully serialized {len(expense_list)} expenses")
        return jsonify({'expenses': expense_list}), 200

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
            return jsonify({'error': 'Expense not found'}), 404

        data = request.get_json()

        if data.get('description'):
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
                    ((Category.user_id == user_id) | (Category.is_default == True))
                ).first()
                if not category:
                    return jsonify({'error': 'Invalid category'}), 400
            expense.category_id = category_id
        if data.get('date'):
            try:
                date_str = data['date'].replace('Z', '+00:00')
                expense.date = datetime.fromisoformat(date_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400

        db.session.commit()

        logger.info(f"Expense {id} updated for user {user_id}")
        return jsonify({'expense': expense.to_dict()}), 200

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
            return jsonify({'error': 'Expense not found'}), 404

        db.session.delete(expense)
        db.session.commit()

        logger.info(f"Expense {id} deleted for user {user_id}")
        return jsonify({'message': 'Expense deleted successfully'}), 200

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

        # Prevent duplicate names for this user
        existing_category = Category.query.filter_by(user_id=user_id, name=data['name']).first()
        if existing_category:
            return jsonify({'error': 'Category already exists'}), 400

        new_category = Category(
            user_id=user_id,
            name=data['name'],
            is_default=False
        )

        db.session.add(new_category)
        db.session.commit()

        logger.info(f"Category added for user {user_id}")
        return jsonify({'category': new_category.to_dict()}), 201

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
@rate_limit(limit=50, period=3600)
def get_categories():
    try:
        user_id = get_jwt_identity()
        categories = Category.query.filter(
            (Category.user_id == user_id) | (Category.is_default == True)
        ).order_by(Category.name).all()

        return jsonify({'categories': [cat.to_dict() for cat in categories]}), 200

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