import { fdb } from './_firebase.js';

export default async function handler(req: any, res: any) {
    const settingsRef = fdb.collection('config').doc('payment_settings');

    if (req.method === 'GET') {
        try {
            const doc = await settingsRef.get();
            if (!doc.exists) {
                return res.json({
                    bank_name: '',
                    bank_account: '',
                    account_holder: ''
                });
            }
            return res.json(doc.data());
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        // In a real app, we should check if the user is an admin here.
        // For now, we assume the frontend only allows admins to call this.
        try {
            const { bank_name, bank_account, account_holder } = req.body;
            await settingsRef.set({
                bank_name: bank_name || '',
                bank_account: bank_account || '',
                account_holder: account_holder || '',
                updated_at: new Date().toISOString()
            }, { merge: true });
            return res.json({ success: true });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
