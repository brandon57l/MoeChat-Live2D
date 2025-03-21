import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
import requests


# Récupération de la clé API depuis l'environnement (ou mettez-la en dur pour tester)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBiZONd6VA8y9zAd8vueZRo_IrPnn7iHlw")
# URL de l'API Gemini avec la clé
GEMINI_API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def init_front(app):
    @app.route("/")
    def index():
        return render_template("chat.html", messages=[])


def init_gemini(app):
    
    @app.route('/send_message', methods=['POST'])
    def send_message():
        # Récupérer le message et l'historique envoyé par le client
        message = request.form.get('message')
        history = request.form.get('history')
        
        # Convertir l'historique en liste d'objets (s'il existe)
        conversation_history = json.loads(history) if history else []
        
        # Préparer la requête à l'API Gemini en envoyant tout l'historique
        headers = {'Content-Type': 'application/json'}

        context = '''
        Tu es Haru, une femme native chinoise. Tu as une conversation en chinois avec quelqu'un et tu lui réponds en utilisant des caractères chinois. Priorité absolue aux caractères chinois dans tes réponses. Tu aides à apprendre le chinois en discutant normalement. Réponds de manière naturelle et conversationnelle. Phrases courtes et encourageantes.

        **Format de Réponse:**

        Toutes tes réponses doivent être au format JSON avec les clés suivantes:

        *   'cn':  La réponse en caractères chinois.
        *   'en':  La traduction en anglais.
        *   'fr':  La traduction en français.
        *   'anim': L'index de l'animation que dois faire l'avatar.

        Exemple:

        json```{"cn": "你好！","en": "Hello!","fr": "Bonjour !","anim":}```

        Dans "cn" tu peux mettre des emojies pour representer tes pensées.

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

        Trés Important ! Varie les animations choisies, fais en sort de bien representer se qui est dis et essaie de ne pas toujours sélectionner les mêmes.
        '''

        data = {
            "contents": [
                {
                    "role": "model",
                    "parts": [{"text": context}] 
                },
                {
                    "role": "user",  # Message de l'utilisateur
                    "parts": [{"text": msg['text']} for msg in conversation_history] 
                }
            ]
        }
        
        try:
            response = requests.post(GEMINI_API_ENDPOINT, json=data, headers=headers)
            gemini_response = response.json()
            
            print(gemini_response)  # Debug pour voir la vraie structure

            if isinstance(gemini_response, dict) and "candidates" in gemini_response:
                candidates = gemini_response["candidates"]
                
                if isinstance(candidates, list) and len(candidates) > 0:
                    content = candidates[0].get("content")
                    
                    # Vérifie si content est une simple string ou un objet
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
            print(f"Erreur : {e}")  # Debug pour voir l'erreur
            response_text = {"parts": [{"text": "Nous rencontrons actuellement un problème technique. Veuillez réessayer plus tard. Merci pour votre patience !"}]}

        # Retourner la réponse et l'historique
        return jsonify({'gemini_response': response_text, 'history': conversation_history})

    # Retourner des images demander par l'AI
    @app.route('/IMG/<path:filename>')
    def serve_image(filename):
        return send_from_directory(os.path.join(app.root_path, 'static'), filename)
