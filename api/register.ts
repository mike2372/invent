import { fdb, mapDoc, admin, ensureAdmin } from './_firebase.js';

export default async function handler(req: any, res: any) {
    await ensureAdmin();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, password, full_name, email, phone } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        // Check if username already exists
        const existingSnapshot = await fdb.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        // Create new user
        const newUser = {
            username,
            password,
            full_name: full_name || '',
            email: email || '',
            phone: phone || '',
            role: 'client',
            is_guest: false,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await fdb.collection('users').add(newUser);

        res.json({
            success: true,
            user: {
                id: docRef.id,
                username,
                role: 'client',
                full_name: newUser.full_name,
                email: newUser.email,
                phone: newUser.phone,
                is_guest: false
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
}
