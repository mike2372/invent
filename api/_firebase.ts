import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
    }
}

const fdb = admin.firestore();

// Helper to map Firestore docs to objects with ID
export const mapDoc = (doc: admin.firestore.DocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
});

export { admin, fdb };
