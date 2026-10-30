import * as faceapi from 'face-api.js';
import { supabase } from '../utils/supabase';

let modelsLoaded = false;

export async function loadModels() {
    if (modelsLoaded) return;
    try {
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log('Biometric models loaded successfully');
    } catch (error) {
        console.error('Failed to load biometric models:', error);
        throw error;
    }
}

export async function verifyFace(
    liveCanvas: HTMLCanvasElement,
    userId: string
): Promise<boolean> {
    await loadModels();

    // 1. Detect live face
    const liveDetection = await faceapi.detectSingleFace(liveCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!liveDetection) {
        throw new Error("No valid facial landmarks detected.");
    }

    const liveDescriptor = liveDetection.descriptor;

    // 2. Fetch baseline images URLs
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('profile_images')
        .eq('id', userId)
        .single();

    if (profileError || !profileData || !profileData.profile_images || profileData.profile_images.length === 0) {
        throw new Error("No baseline images found for verification.");
    }

    const baselineUrls: string[] = profileData.profile_images;

    // 3. Compare with baseline images
    let matchFound = false;
    for (const url of baselineUrls) {
        try {
            // Using fetchImage directly from face-api
            const img = await faceapi.fetchImage(url);

            const baselineDetection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (baselineDetection) {
                const distance = faceapi.euclideanDistance(liveDescriptor, baselineDetection.descriptor);
                if (distance < 0.45) {
                    matchFound = true;
                    break;
                }
            }
        } catch (e) {
            console.warn("Failed to process baseline image", url, e);
        }
    }

    if (!matchFound) {
        throw new Error("Biometric verification failed: No match found.");
    }

    // 4. Secure Database Mutation
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', userId);

    if (updateError) {
        throw new Error("Failed to update verification status in database.");
    }

    return true;
}
