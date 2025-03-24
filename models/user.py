from extensions.database import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
import random

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(150), unique=True, nullable=True)
    password_hash = db.Column(db.String(150), nullable=True)  # Pour les utilisateurs OAuth, peut être nul
    auth_provider = db.Column(db.String(50), default='local')

    # Contexte et historique de conversation
    conversation_context = db.Column(db.Text, nullable=True, default='')
    conversation_history = db.Column(db.Text, nullable=True, default='')

    # Récompenses et lootbox
    tokens = db.Column(db.Float, default=0.0)  # Nombre de tokens de l'utilisateur
    lootboxes = db.Column(db.Integer, default=0)  # Nombre de lootboxes disponibles
    
    # Suivi du temps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # Gestion de l'historique de conversation
    def add_to_history(self, message):
        try:
            history = json.loads(self.conversation_history) if self.conversation_history else []
        except json.JSONDecodeError:
            history = []
        history.append(message)
        self.conversation_history = json.dumps(history)

    def get_history(self):
        try:
            return json.loads(self.conversation_history) if self.conversation_history else []
        except json.JSONDecodeError:
            return []

    # Gestion du contexte de conversation
    def update_context(self, context):
        self.conversation_context = json.dumps(context)

    def get_context(self):
        try:
            return json.loads(self.conversation_context) if self.conversation_context else {}
        except json.JSONDecodeError:
            return {}

    # Gestion des tokens
    def add_tokens(self, amount):
        self.tokens += amount

    def spend_tokens(self, amount):
        if self.tokens >= amount:
            self.tokens -= amount
            return True
        return False

    # Gestion des lootboxes
    def add_lootbox(self, amount=1):
        self.lootboxes += amount

    def open_lootbox(self):
        if self.lootboxes > 0:
            self.lootboxes -= 1
            reward = self.get_random_reward()
            return reward
        return None

    def get_random_reward(self):
        rewards = ["Avatar Skin", "Exclusive Dialogue", "Bonus Tokens", "Special Emote"]
        reward = random.choice(rewards)
        if reward == "Bonus Tokens":
            bonus_tokens = random.randint(10, 50)
            self.add_tokens(bonus_tokens)
            return f"{bonus_tokens} Tokens"
        return reward
