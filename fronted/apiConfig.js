export const BASE_URL = 'http://192.168.0.131:5000';
export const VIDEO_API_URL = 'https://7aa8d2c2a045.ngrok-free.app';
export const VOICE_API_URL = 'https://de466bccebe4.ngrok-free.app';

export const API_ENDPOINTS = {
    //LoginRegisterScreen
    REGISTER: `${BASE_URL}/register`,
    LOGIN: `${BASE_URL}/login`,

    //CreateCharacter
    CREATE_CHARACTER: `${BASE_URL}/create-character`,
    UPDATE_CLOTHING_STYLE: `${BASE_URL}/update_clothing_style`,
    UPDATE_PITCH_SPEED: `${BASE_URL}/update_pitch_speed`,
    UPDATE_APPEARANCE_PATH: `${BASE_URL}/update_appearance_path`,
    UPDATE_VOICE_PATH: `${BASE_URL}/update_voice_path`,
    UPDATE_ANIMATION_PATH: `${BASE_URL}/update_animation_path`,


    // RouteInfo //用於get
    ROLELIST: `${BASE_URL}/rolelist`,
    GET_IMAGE: `${BASE_URL}/get-image`,

    // AppearanceScreen
    GENERATE_APPEARANCE_BOY: `${BASE_URL}/generate-appearance-boy`,
    GENERATE_APPEARANCE_GIRL: `${BASE_URL}/generate-appearance-girl`,
    GET_IMAGE_BASE64: `${BASE_URL}/get-image-base64`,
    GENERATE_EMOTION: `${BASE_URL}/generate-emotion`,
    GENERATE_VIDEO: `${BASE_URL}/generate-video`,

    // VoiceSettingScreen
    TRAIN_VOICE: `${VOICE_API_URL}/train-voice-model`,
    GENERATE_VOICE: `${VOICE_API_URL}/generate-voice`,
    GET_AUDIO_BASE64: `${BASE_URL}/get-audio-base64`,
    UPLOAD_MODEL: `${VOICE_API_URL}/upload-model`,

    // ChatScreen
    CHAT: `${BASE_URL}/chat`,
    CHAT_IMAGE: `${BASE_URL}/chat-image`,
    CHAT_VOCAL: `${BASE_URL}/chat-vocal`,
    GENERATE_MEMORY: `${BASE_URL}/generate-memory`,
    OOC: `${BASE_URL}/ooc`,

    // PhotoUploadScreen
    GENERATE: `${BASE_URL}/generate`,

    // VideoScreen
    VIDEO_VOICE: `${BASE_URL}/video-voice`,
    VIDEO_RESPONSE: `${BASE_URL}/video-response`,
    VIDEO_PHOTO: `${BASE_URL}/video-photo`,

    //Memory
    GET_MEMORY_CATEGORIES: `${BASE_URL}/get-memory-categories`,
    GET_MEMORY_DETAIL: `${BASE_URL}/get-memory-detail`,
    GENERATE_MEMORY: `${BASE_URL}/generate-memory`,
    UPDATE_MEMORY: `${BASE_URL}/update-memory`,
    DELETE_MEMORY: `${BASE_URL}/delete-memory`,
    ADD_MEMORY_CATEGORY: `${BASE_URL}/add-memory-category`,
    GET_SINGLE_MEMORY: `${BASE_URL}/get-single-memory`,

    //Setting
    SETTING_PROFILE: `${BASE_URL}/setting-profile`,
    GET_PROFILE: `${BASE_URL}/get-profile`,
};