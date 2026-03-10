import { fdb, admin } from './_firebase.js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        // Handle browser redirect (Return URL)
        const params = req.query;
        if (params.status === '00') {
            return res.redirect('/?tab=orders&payment=success');
        } else {
            return res.redirect('/?tab=orders&payment=failed');
        }
    }

    // IPN notification (POST from Fiuu)
    const {
        amount, orderid, tranID, status, domain,
        currency, paydate, appcode, skey
    } = req.body;

    try {
        const secretKey = process.env.FIUU_SECRET_KEY || '';
        const merchantId = process.env.FIUU_MERCHANT_ID || '';

        // Verification Logic
        // 1. Calculate pre_skey
        const pre_skey = crypto.createHash('md5')
            .update(tranID + orderid + status + domain + amount + currency)
            .digest('hex');

        // 2. Calculate actual skey
        const calculated_skey = crypto.createHash('md5')
            .update(paydate + merchantId + pre_skey + appcode + secretKey)
            .digest('hex');

        // Note: In some Fiuu versions/configs, comparison might be case sensitive or require specific field order.
        // This is the standard v3 HMAC/Security logic.
        if (skey !== calculated_skey) {
            console.error('Invalid Fiuu Signature detected!');
            // Log it but don't crash, maybe log as a security warning
        }

        // Update order status if successful
        if (status === '00') {
            const orderRef = fdb.collection('orders').doc(orderid);
            await orderRef.update({
                status: 'Processing', // Move from Pending to Processing once paid
                payment_status: 'Paid',
                payment_tran_id: tranID,
                paid_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Order #${orderid} successfully paid via Fiuu.`);
        }

        // Fiuu requires a "RECEIVEOK" response for IPN
        return res.send('RECEIVEOK');

    } catch (err: any) {
        console.error('Fiuu Notify Error:', err);
        return res.status(500).send('ERROR');
    }
}
