import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
import requests


# Récupération de la clé API depuis l'environnement (ou mettez-la en dur pour tester)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBiZONd6VA8y9zAd8vueZRo_IrPnn7iHlw")
# URL de l'API Gemini avec la clé
GEMINI_API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def init_front(app):
    @app.route("/chat")
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

        Exemple:

        json```{"cn": "你好！","en": "Hello!","fr": "Bonjour !"}```

        Dans "cn" tu peux mettre des emojies pour representer tes pensées.
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
