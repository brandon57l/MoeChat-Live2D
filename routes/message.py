from flask import request, jsonify
from flask_login import login_required, current_user
from extensions.database import db
from models.message import Message

def init_message(app):
    @login_required
    @app.route("/load_messages")
    def load_messages():
        try:
            page = int(request.args.get('page', 1))
            per_page = 10

            # Récupération des messages en ordre décroissant (les plus récents en premier)
            pagination = Message.query.filter_by(user_id=current_user.id)\
                                .order_by(Message.id.desc())\
                                .paginate(page=page, per_page=per_page, error_out=False)

            messages_list = [{
                'id': msg.id,
                'text': msg.text,
                'sender': msg.sender,
                'created_at': msg.created_at.isoformat()
            } for msg in pagination.items]

            return jsonify({
                'messages': messages_list,
                'has_next': pagination.has_next
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

