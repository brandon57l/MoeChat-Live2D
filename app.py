
from flask import Flask
from flask_cors import CORS
from routes.llm import init_front, init_gemini
from routes.tts import init_kokoro

app = Flask(__name__)
CORS(app)

init_front(app)
init_gemini(app)
init_kokoro(app)

if __name__ == '__main__':
    app.run(debug=True)
