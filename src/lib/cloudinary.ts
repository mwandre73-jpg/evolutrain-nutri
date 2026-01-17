export const CLOUDINARY_CLOUD_NAME = "dkyr4jj6t";
export const CLOUDINARY_UPLOAD_PRESET = "ml_default";
export const CLOUDINARY_API_KEY = "828764137397953";

export async function getCloudinaryConfig() {
    return {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        apiKey: CLOUDINARY_API_KEY
    };
}
