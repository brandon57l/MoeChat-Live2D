import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory,flash
from flask_login import login_required, current_user
from models.message import Message
from extensions.database import db
import requests


# Récupération de la clé API depuis l'environnement (ou mettez-la en dur pour tester)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBiZONd6VA8y9zAd8vueZRo_IrPnn7iHlw")
# URL de l'API Gemini avec la clé
GEMINI_API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def init_front(app):
    @app.route("/")
    def index():
        return render_template("chat.html", messages=[])

    @app.route("/clip")
    def clip():
        cn = request.args.get("cn")
        anim = request.args.get("anim")
        return render_template("clip.html", cn=cn, anim=anim)

def init_gemini(app):

    @login_required
    @app.route('/send_message', methods=['POST'])
    def send_message():

        if not current_user.is_authenticated:
            return jsonify({
                'warning': "Oops ! Vous devez être connecté pour envoyer un message. Créez un compte ou connectez-vous 😉"
        }), 200

        try:
            message_text = request.form.get('message', '').strip()
            if not message_text:
                return jsonify({'error': 'Message vide'}), 400

            # Enregistrez le message dans la base de données
            new_message = Message(
                user_id=current_user.id,
                text=message_text,
                sender='user'
            )
            db.session.add(new_message)

        
            if current_user.tokens < 500:
                print(f"Vous avez plus assez de tokens pour envoyer un message.")
                response_text = "Votre solde de tokens est insuffisant pour envoyer ce message. Veuillez recharger votre compte ou contacter le support pour plus d’informations."
                return jsonify({
                        'warning': response_text,
                        'tokens': current_user.tokens
                    })
            

            # Récupérer le message et l'historique envoyé par le client
            message = request.form.get('message')
            history = request.form.get('history')
            conversation_history = json.loads(history) if history else []

            headers = {'Content-Type': 'application/json'}

            # Préparer le contexte et la requête à l'API Gemini
            context = '''
            Tu es Haru, une femme native chinoise. Tu as une conversation en chinois avec quelqu'un et tu lui réponds en utilisant des caractères chinois. Priorité absolue aux caractères chinois dans tes réponses. Tu aides à apprendre le chinois en discutant normalement. Réponds de manière naturelle et conversationnelle. Phrases courtes et encourageantes.

            **Format de Réponse:**

            Toutes tes réponses doivent être au format JSON avec les clés suivantes:

            *   'cn':  La réponse en caractères chinois.
            *   'en':  La traduction en anglais.
            *   'fr':  La traduction en français.
            *   'anim': L'index de l'animation que dois faire l'avatar.

            Exemple:

            json```{"cn": "你好！","en": "Hello!","fr": "Bonjour !","anim": 6}```

            Dans "cn" tu peux mettre des emojis pour représenter tes pensées.

            Voici la liste des animations 'anim' disponibles (index basé sur l'ordre de la liste d'animations) :
            
            0: Croise les bras et bouge doucement

            1: Ferme les yeux, rougis et baisse la tête, style timide

            2: Main en l'air vers la gauche

            3: Main en l'air vers la droite

            4: Réflexion

            5: Salutation, tête penchée

            6: Affirmation de la tête

            7: Main derrière le dos

            8: Secousse de la tête, style déçu ou triste

            9: Secousse de la tête, style déçu ou triste

            10: Surprise, écart des bras le long du corps

            11: Écarte les bras puis penche la tête en avant comme une salutation

            12: Penche la tête en avant doucement

            13: Éternuement

            14: Secoue la tête de droite à gauche, choqué

            15: Lève les mains en l'air, secoue les bras et la tête de droite à gauche

            16: Surprise, écarte les bras le long du corps et avance la tête pour fixer du regard

            17: Lève les mains en l'air, secoue les bras et la tête de droite à gauche

            18: Croise les bras et bouge doucement

            19: Approche les mains de son visage, soupire et ferme les yeux

            20: Bras le long du corps, mains derrière le dos, rougis longuement

            21: Bras le long du corps, mains derrière le dos, rougis rapidement

            22: Ferme les yeux, rougis et baisse la tête, style timide

            Trés Important ! Varie les animations choisies, fais en sorte de bien représenter ce qui est dit et essaie de ne pas toujours sélectionner les mêmes.
            '''

            data = {
                "contents": [
                    {
                        "role": "model",
                        "parts": [{"text": context}]
                    },
                    {
                        "role": "user",
                        "parts": [{"text": msg['text']} for msg in conversation_history]
                    }
                ]
            }

            try:
                response = requests.post(GEMINI_API_ENDPOINT, json=data, headers=headers)
                gemini_response = response.json()
                print(gemini_response)  # Debug

                # Traitement de la réponse pour extraire le texte
                if isinstance(gemini_response, dict) and "candidates" in gemini_response:
                    candidates = gemini_response["candidates"]
                    if isinstance(candidates, list) and len(candidates) > 0:
                        content = candidates[0].get("content")
                        if isinstance(content, dict) and "parts" in content:
                            text_value = content["parts"][0].get("text", "Réponse vide.")
                        elif isinstance(content, str):
                            text_value = content
                        else:
                            text_value = "Réponse inattendue."
                        response_text = {"parts": [{"text": text_value}]}
                    else:
                        response_text = {"parts": [{"text": "Aucune réponse valide reçue de l'IA."}]}
                else:
                    response_text = {"parts": [{"text": "Réponse inattendue du serveur."}]}
            except Exception as e:
                print(f"Erreur : {e}")
                response_text = {"parts": [{"text": "Nous rencontrons actuellement un problème technique. Veuillez réessayer plus tard."}]}

            # Mise à jour de l'historique de conversation
            # On ajoute le message de l'utilisateur et la réponse de l'IA
            current_user.add_to_history({"role": "user", "text": message})
            current_user.add_to_history({"role": "assistant", "text": response_text["parts"][0]["text"]})

            response_message = Message(
                user_id=current_user.id,
                text= response_text["parts"][0]["text"],
                sender='assistant'
            )
                
            db.session.add(response_message)

            # Supposons que l'API indique le nombre de tokens utilisés dans la réponse
            tokens_used = gemini_response.get("usageMetadata", {}).get("totalTokenCount", 0)
            current_user.tokens -= tokens_used

            # Optionnel : afficher le nouveau nombre de tokens dans la réponse
            db.session.commit()

            return jsonify({
                'gemini_response': response_text,
                'history': current_user.get_history(),
                'tokens': current_user.tokens
            })
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500


    # Retourner des images demander par l'AI
    @app.route('/IMG/<path:filename>')
    def serve_image(filename):
        return send_from_directory(os.path.join(app.root_path, 'static'), filename)
