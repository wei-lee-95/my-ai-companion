export const BASE_URL = 'http://192.168.0.131:5000';
export const VIDEO_API_URL = 'https://0828e917876f.ngrok-free.app';
export const VOICE_API_URL = 'https://933ac1807001.ngrok-free.app';

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
    GENERATE_EMOTION: `${BASE_URL}/generate-emotion`,
    GENERATE_VIDEO: `${BASE_URL}/generate-video`,
    GET_IMAGE_BASE64: `${BASE_URL}/get-image-base64`,


    // VoiceSettingScreen
    TRAIN_VOICE: `${BASE_URL}/train-voice-model`,
    GENERATE_VOICE: `${BASE_URL}/generate-voice`,
    GET_AUDIO_BASE64: `${BASE_URL}/get-audio-base64`,

    // ChatScreen
    CHAT: `${BASE_URL}/chat`,
    CHAT_IMAGE: `${BASE_URL}/chat-image`,
    CHAT_VOCAL: `${BASE_URL}/chat-vocal`,
    GENERATE_MEMORY: `${BASE_URL}/generate-memory`,

    // PhotoUploadScreen
    GENERATE: `${BASE_URL}/generate`,

    // VideoScreen
    VIDEO_VOICE: `${BASE_URL}/video-voice`,
    VIDEO_RESPONSE: `${BASE_URL}/video-response`,
    VIDEO_PHOTO: `${BASE_URL}/video-photo`,
    VIDEO_LIP_SYNC: `${VIDEO_API_URL}/generate-lip-sync`,
    VIDEO_NO_LIP_SYNC: `${BASE_URL}/get-no-lip-sync-video`,

    //Memory
    GET_MEMORY_CATEGORIES: `${BASE_URL}/get-memory-categories`,
    GET_MEMORY_DETAIL: `${BASE_URL}/get-memory-detail`,
    GENERATE_MEMORY: `${BASE_URL}/generate-memory`,
    UPDATE_MEMORY: `${BASE_URL}/update-memory`,
    DELETE_MEMORY: `${BASE_URL}/delete-memory`,
    ADD_MEMORY_CATEGORY: `${BASE_URL}/add-memory-category`,
    GET_SINGLE_MEMORY: `${BASE_URL}/get-single-memory`,
};