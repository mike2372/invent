import { query } from './_db.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const users = await query<{
      id: number;
      username: string;
      role: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    }>(
      `select id, username, role, full_name, email, phone
       from users
       where username = $1 and password = $2
       limit 1`,
      [username, password]
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err: any) {
    console.error('login error', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process login',
      error: err?.message ?? 'Unknown error',
    });
  }
}

