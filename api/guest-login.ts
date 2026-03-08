import { query } from './_db';

type Role = 'admin' | 'client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { role } = req.body as { role?: Role };

  if (role !== 'admin' && role !== 'client') {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    const existing = await query<{
      id: number;
      username: string;
      role: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    }>(
      `select id, username, role, full_name, email, phone
       from users
       where role = $1
       order by id
       limit 1`,
      [role]
    );

    let user = existing[0];

    if (!user) {
      const fullName = role === 'admin' ? 'Guest Admin' : 'Guest Client';
      const username = `guest_${role}_${Date.now()}`;

      const inserted = await query<{ id: number }>(
        `insert into users (username, password, role, full_name)
         values ($1, $2, $3, $4)
         returning id`,
        [username, 'guest_pass', role, fullName]
      );

      user = {
        id: inserted[0].id,
        username,
        role,
        full_name: fullName,
        email: null,
        phone: null,
      };
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
    console.error('guest-login error', err);
    return res.status(500).json({ success: false, message: 'Failed to process guest login' });
  }
}

