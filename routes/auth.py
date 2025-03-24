from flask import Blueprint, request, redirect, url_for, flash, render_template
from models.user import User
from extensions.database import db
from flask_login import login_user, logout_user, login_required

def init_auth(app):
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')
            user = User.query.filter_by(email=email).first()
                   
            if user and user.check_password(password):
                login_user(user)
                flash("Connexion réussie", "success")
                return redirect("/")  # Redirige vers une page sécurisée (dashboard)

            flash("Adresse email ou mot de passe incorrect", "danger")
            return redirect(url_for('login'))

        return render_template('login.html')  # Formulaire de connexion

    @app.route('/signup', methods=['GET', 'POST'])
    def signup():
        if request.method == 'POST':
            email = request.form.get('email')
            username = request.form.get('username')
            password = request.form.get('password')
            tokens = 10_000

            if User.query.filter_by(email=email).first():
                flash("L'adresse email est déjà utilisée", "warning")
                return redirect(url_for('signup'))

            new_user = User(email=email, username=username, tokens=tokens)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()

            # Auto-login après l'inscription
            login_user(new_user)
            flash("Compte créé avec succès et connecté automatiquement.", "success")
            return redirect("/")  # Redirige vers la page sécurisée (dashboard)

        return render_template('signup.html')  # Formulaire d'inscription

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        flash("Vous avez été déconnecté", "info")
        return redirect(url_for('login'))





    @app.route('/login/firebase', methods=['POST'])
    def login_firebase():
        token = request.form.get('token')
        # Placeholder pour la vérification Firebase
        # Utilisez firebase_admin.auth.verify_id_token(token) pour la validation réelle
        flash("Authentification Firebase non implémentée", "warning")
        return redirect(url_for('login'))
