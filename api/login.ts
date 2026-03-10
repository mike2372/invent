import { fdb, mapDoc } from './_firebase.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    const snapshot = await fdb.collection('users')
      .where('username', '==', username)
      .where('password', '==', password)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const user = mapDoc(snapshot.docs[0]) as any;
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Auth failed', error: err.message });
  }
}
