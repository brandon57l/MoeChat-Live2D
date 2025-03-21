
from flask import Flask
from routes.llm import init_front, init_gemini
from routes.tts import init_kokoro

app = Flask(__name__)

init_front(app)
init_gemini(app)
init_kokoro(app)

if __name__ == '__main__':
    app.run(debug=False)
