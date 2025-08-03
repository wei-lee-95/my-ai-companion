export const BASE_URL = 'http://192.168.0.131:5000';

export const API_ENDPOINTS = {
    // AppearanceScreen
    GENERATE_APPEARANCE_BOY: `${BASE_URL}/generate-appearance-boy`,
    GENERATE_APPEARANCE_GIRL: `${BASE_URL}/generate-appearance-girl`,
    GET_IMAGE_BASE64: `${BASE_URL}/get-image-base64`,

    // ChatScreen
    CHAT: `${BASE_URL}/chat`,
    CHAT_IMAGE: `${BASE_URL}/chat-image`,
    CHAT_VOCAL: `${BASE_URL}/chat-vocal`,
    GENERATE_MEMORY: `${BASE_URL}/generate-memory`,

    // PhotoUploadScreen
    GENERATE: `${BASE_URL}/generate`,

    // VideoScreen
    VIDEO_VOICE: `${BASE_URL}/video-voice`,
};