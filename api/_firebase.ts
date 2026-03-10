import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

        // Clean the key: remove quotes, fix escaped newlines, and remove carriage returns
        const cleanedKey = rawKey
            .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
            .replace(/\\n/g, '\n')        // Fix escaped \n
            .replace(/\r/g, '')           // Remove any carriage returns
            .trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: cleanedKey,
            }),
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error during admin.initializeApp:', error);
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
    try {
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
    } catch (err) {
        console.error('Failed to ensureAdmin:', err);
        throw err; // Re-throw so the handler knows it failed
    }
};

export { admin, fdb };
