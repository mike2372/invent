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

// Ensure a default admin user exists for fresh databases
export const ensureAdmin = async () => {
    const usersRef = fdb.collection('users');
    const snapshot = await usersRef.where('username', '==', 'admin').limit(1).get();
    if (snapshot.empty) {
        await usersRef.add({
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            full_name: 'System Admin',
            email: 'admin@stockmaster.my',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Auto-seeded admin user');
    }
};

export { admin, fdb };
