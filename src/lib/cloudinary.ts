export async function getCloudinaryConfig() {
    return {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    };
}

// Para o Cloudinary Widget, geralmente usamos variáveis de ambiente no lado do cliente
// ou geramos uma assinatura segura no servidor. Como o usuário ainda não proveu
// as chaves, vou deixar a estrutura pronta para o Widget (Upload Aberto/Preset).
