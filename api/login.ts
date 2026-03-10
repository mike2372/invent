import { fdb, mapDoc, ensureAdmin } from './_firebase.js';

export default async function handler(req: any, res: any) {
  await ensureAdmin();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const rawUsername = req.body.username || '';
  const rawPassword = req.body.password || '';

  // Trim whitespace and handle potential mobile auto-capitalization 
  // (Assuming usernames are typically meant to be case-insensitive, but keeping it exact for now besides whitespace)
  const username = rawUsername.trim();
  const password = rawPassword.trim();

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
          phone: user.phone,
          is_guest: false
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Auth failed', error: err.message });
  }
}
