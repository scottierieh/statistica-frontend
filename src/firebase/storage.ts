'use client';

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from './index';

// Initialize Firebase and get storage instance
const { storage } = initializeFirebase();

export const uploadImage = (
    file: File,
    path: string,
    onProgress: (progress: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                });
            }
        );
    });
};

export const deleteImage = (imageUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const imageRef = ref(storage, imageUrl);

        deleteObject(imageRef)
            .then(() => resolve())
            .catch((error) => {
                console.error("Delete failed:", error);
                reject(error);
            });
    });
};
