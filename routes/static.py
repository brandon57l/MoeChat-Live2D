from flask import send_from_directory 
import os

def serve_static(app):
    app.config['STATIC_FOLDER'] = 'static'
    
    @app.route('/static/Resources/Haru/Haru.2048/hairs/<filename>')
    def serve_hair_texture(filename):
        # Chemin vers le dossier "hairs" (vous pouvez ajuster cela selon votre structure de fichiers)
        hair_texture_dir = os.path.join(app.config['STATIC_FOLDER'], 'Resources/Haru/Haru.2048/hairs')
        
        # Vérifiez si le fichier existe avant de le servir
        if os.path.exists(os.path.join(hair_texture_dir, filename)):
            return send_from_directory(hair_texture_dir, filename)
        else:
            return "Fichier non trouvé", 404