import { fdb, mapDoc, admin, ensureAdmin } from './_firebase.js';

export default async function handler(req: any, res: any) {
  await ensureAdmin();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { role } = req.body;
  try {
    const snapshot = await fdb.collection('users').where('role', '==', role).limit(1).get();
    let user;

    if (snapshot.empty) {
      const username = `guest_${role}_${Date.now()}`;
      const newUser = {
        username,
        password: 'guest_pass',
        role,
        full_name: `Guest ${role === 'admin' ? 'Admin' : 'Client'}`,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = await fdb.collection('users').add(newUser);
      user = { id: docRef.id, ...newUser };
    } else {
      user = mapDoc(snapshot.docs[0]);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: (user as any).username,
        role: (user as any).role,
        full_name: (user as any).full_name,
        email: (user as any).email,
        phone: (user as any).phone
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process guest login', error: err.message });
  }
}
