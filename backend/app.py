from flask_cors import CORS
from flask import Flask
from routes.AppearanceApi import appearance_bp
from routes.VoiceApi import voice_bp
from routes.ChatRoomApi import chatRoom_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(appearance_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(chatRoom_bp)

@app.route('/')
def index():
    return {"status": "API 正常運作中"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)