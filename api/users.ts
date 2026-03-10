import { fdb, mapDoc, admin } from './_firebase.js';

export default async function handler(req: any, res: any) {
    const idRaw = req.query.id as string || '';
    const parts = idRaw.split('/');
    const id = parts[0];

    try {
        if (req.method === 'GET') {
            const snapshot = await fdb.collection('users').where('role', '==', 'client').get();
            const users = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    username: data.username,
                    role: data.role,
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone,
                    is_guest: data.is_guest || false
                };
            });
            return res.json(users);
        }

        if (req.method === 'POST') {
            const { username, password, full_name, email, phone, role } = req.body;
            const docRef = await fdb.collection('users').add({
                username, password, full_name, email, phone,
                role: role || 'client',
                is_guest: false,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.json({ success: true, id: docRef.id });
        }

        if (req.method === 'PUT' && id) {
            const { full_name, email, phone } = req.body;
            await fdb.collection('users').doc(id).update({ full_name, email, phone });
            const doc = await fdb.collection('users').doc(id).get();
            const user = mapDoc(doc) as any;
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    is_guest: user.is_guest || false
                }
            });
        }

        if (req.method === 'DELETE' && id) {
            const batch = fdb.batch();
            const ordersSnapshot = await fdb.collection('orders').where('user_id', '==', id).get();
            ordersSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { user_id: null });
            });
            batch.delete(fdb.collection('users').doc(id));
            await batch.commit();
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
