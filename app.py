# app.py
from flask import Flask
from flask_cors import CORS
from config import Config
from extensions.database import init_db
from routes.llm import init_front, init_gemini
# from routes.tts import init_kokoro
from routes.auth import init_auth
from routes.static import serve_static
from routes.message import init_message
from extensions.login_manager import init_login_manager


app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialisation des extentions
init_db(app)
init_login_manager(app)


# Initialisation des routes
init_message(app)
init_auth(app)
init_front(app)
init_gemini(app)

# init_kokoro(app)

serve_static(app)

if __name__ == '__main__':
    app.run(debug=True)
