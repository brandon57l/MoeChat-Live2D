from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import soundfile as sf


def init_kokoro(app):
    @app.route('/synthesize', methods=['POST'])
    def synthesize():
        data = request.get_json(force=True)

        # Vérification du paramètre text
        if not data or 'text' not in data:
            return jsonify({'error': 'Le paramètre "text" est requis.'}), 400

        # Récupération des paramètres avec valeurs par défaut
        text = data.get('text')
        voice = data.get('voice', 'zf_xiaobei')
        speed = data.get('speed', 1)

        try:
            # Appel de votre pipeline TTS
            # Ici, on suppose que pipeline renvoie un itérateur avec des tuples (index, graphemes, phonemes, audio)
            generator = pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+')

            # On récupère le premier résultat audio
            _, _, audio = next(generator)

        except Exception as e:
            return jsonify({'error': f'Erreur lors de la synthèse: {str(e)}'}), 500

        # Création d'un buffer pour stocker le fichier audio
        buffer = io.BytesIO()
        # Sauvegarde en format WAV avec un taux d'échantillonnage de 24000 Hz
        sf.write(buffer, audio, 24000, format='WAV')
        buffer.seek(0)

        # Retourne le fichier audio en réponse
        return send_file(buffer, mimetype='audio/wav', as_attachment=False, download_name='output.wav')