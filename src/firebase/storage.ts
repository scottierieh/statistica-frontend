'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseApp } from './index';

export function getStorageInstance() {
    const app = getFirebaseApp();
    return getStorage(app);
}

export const uploadImage = (
    file: File,
    path: string,
    onProgress: (progress: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const storage = getStorageInstance();
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
        const storage = getStorageInstance();
        const imageRef = ref(storage, imageUrl);

        deleteObject(imageRef)
            .then(() => resolve())
            .catch((error) => {
                console.error("Delete failed:", error);
                reject(error);
            });
    });
};
