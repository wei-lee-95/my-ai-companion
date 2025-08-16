export const BASE_URL = 'http://192.168.0.131:5000';
export const VIDEO_API_URL = 'https://eebde9f702f9.ngrok-free.app';
export const VOICE_API_URL = 'https://a0c09aea1868.ngrok-free.app';

export const API_ENDPOINTS = {
    // AppearanceScreen
    GENERATE_APPEARANCE_BOY: `${BASE_URL}/generate-appearance-boy`,
    GENERATE_APPEARANCE_GIRL: `${BASE_URL}/generate-appearance-girl`,
    GENERATE_EMOTION: `${BASE_URL}/generate-emotion`,
    GENERATE_VIDEO: `${BASE_URL}/generate-video`,
    GET_IMAGE_BASE64: `${BASE_URL}/get-image-base64`,


    // VoiceSettingScreen
    TRAIN_VOICE: `${VOICE_API_URL}/train-voice-model`,
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
};