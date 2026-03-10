import { fdb, mapDoc } from './_firebase.js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID required' });

    try {
        const orderDoc = await fdb.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

        const order = mapDoc(orderDoc) as any;

        const merchantId = process.env.FIUU_MERCHANT_ID || 'TRE_TEST'; // Default to test
        const verifyKey = process.env.FIUU_VERIFY_KEY || 'default_test_key';
        const isSandbox = process.env.FIUU_IS_SANDBOX === 'true';

        const amount = order.total_amount.toFixed(2);
        const vcode = crypto.createHash('md5').update(amount + merchantId + order.id + verifyKey).digest('hex');

        // Fiuu Endpoint
        const endpoint = isSandbox
            ? 'https://sandbox.fiuu.com/RMS/pay/'
            : 'https://pay.fiuu.com/RMS/pay/';

        // Return the parameters needed for the payment form
        return res.json({
            url: endpoint + merchantId + '/',
            params: {
                amount: amount,
                orderid: order.id,
                bill_name: order.customer_name || 'Customer',
                bill_email: order.customer_email || 'customer@example.com', // You might need to fetch user email
                bill_mobile: order.customer_phone || '',
                bill_desc: `Payment for Order #${order.id}`,
                vcode: vcode,
                // These URLs should point to your live site
                returnurl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/fiuu-callback`,
                callbackurl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/fiuu-notify`
            }
        });
    } catch (err: any) {
        console.error('Fiuu Pay Error:', err);
        res.status(500).json({ error: err.message });
    }
}
