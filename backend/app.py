from flask_cors import CORS
from flask import Flask
from routes.AppearanceApi import appearance_bp
from routes.VoiceApi import voice_bp
from routes.ChatRoomApi import chatRoom_bp
from routes.PhotoApi import photo_bp
from routes.MemoryApi import memory_bp
from routes.VideoApi import video_bp
from routes.AuthApi import auth_bp
from routes.CreateCharacterApi import createcharacter_bp
from routes.RouteInfoApi import routeinfo_bp

app = Flask(__name__, static_url_path='/outputs', static_folder='outputs')
CORS(app)

app.register_blueprint(appearance_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(chatRoom_bp)
app.register_blueprint(photo_bp)
app.register_blueprint(memory_bp)
app.register_blueprint(video_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(createcharacter_bp)
app.register_blueprint(routeinfo_bp)

@app.route('/')
def index():
    return {"status": "API 正常運作中"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)