export const BASE_URL = 'http://192.168.0.131:5000';
export const VIDEO_API_URL = 'https://4cc3b2238c94.ngrok-free.app';
export const VOICE_API_URL = 'https://933ac1807001.ngrok-free.app';

export const API_ENDPOINTS = {
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
};