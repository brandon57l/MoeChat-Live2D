from extensions.database import db

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(50), nullable=False)  # "user" ou "gemini"
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
