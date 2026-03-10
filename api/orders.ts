import { fdb, mapDoc, admin } from './_firebase.js';

export default async function handler(req: any, res: any) {
    const idRaw = req.query.id as string || '';
    const parts = idRaw.split('/');
    const id = parts[0];

    try {
        if (req.method === 'GET') {
            if (id) {
                const doc = await fdb.collection('orders').doc(id).get();
                if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
                const order = mapDoc(doc) as any;
                const itemsSnapshot = await doc.ref.collection('items').get();
                order.items = itemsSnapshot.docs.map(mapDoc);
                return res.json(order);
            }
            const { userId, role, includeItems } = req.query;
            let query: admin.firestore.Query = fdb.collection('orders');
            if (role === 'client' && userId) {
                const userDoc = await fdb.collection('users').doc(userId).get();
                const userData = userDoc.data();
                if (userData?.is_guest) {
                    return res.json([]);
                }
                query = query.where('user_id', '==', userId);
            }
            const snapshot = await query.get();
            const orders = await Promise.all(snapshot.docs.map(async d => {
                const order = mapDoc(d) as any;
                if (includeItems === 'true') {
                    const itemsSnapshot = await d.ref.collection('items').get();
                    order.items = itemsSnapshot.docs.map(mapDoc);
                }
                return order;
            }));
            return res.json(orders);
        }

        if (req.method === 'POST') {
            const { customer_name, delivery_date, items, user_id } = req.body;
            if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item required' });

            let totalAmount = 0;
            const itemDetails = [];
            for (const item of items) {
                const prodRef = fdb.collection('products').doc(item.product_id);
                const prodDoc = await prodRef.get();
                if (!prodDoc.exists) throw new Error(`Product ${item.product_id} not found`);
                const product = prodDoc.data() as any;

                if (item.variation_id) {
                    const varRef = prodRef.collection('variations').doc(item.variation_id);
                    const varDoc = await varRef.get();
                    if (!varDoc.exists) throw new Error(`Variation ${item.variation_id} not found`);
                    const variation = varDoc.data() as any;
                    if (variation.quantity < item.quantity) throw new Error(`Insufficient stock for ${variation.name}`);
                    totalAmount += variation.price * item.quantity;
                    itemDetails.push({ ...item, price_at_order: variation.price, product_name: product.name, variation_name: variation.name, variation_sku: variation.sku });
                } else {
                    if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
                    totalAmount += product.price * item.quantity;
                    itemDetails.push({ ...item, price_at_order: product.price, product_name: product.name, product_sku: product.sku });
                }
            }

            const orderRef = await fdb.collection('orders').add({
                customer_name, delivery_date, total_amount: totalAmount, user_id, status: 'Pending',
                order_date: admin.firestore.FieldValue.serverTimestamp(), created_at: admin.firestore.FieldValue.serverTimestamp()
            });

            for (const item of itemDetails) {
                await orderRef.collection('items').add(item);
                const prodRef = fdb.collection('products').doc(item.product_id);
                if (item.variation_id) {
                    const varRef = prodRef.collection('variations').doc(item.variation_id);
                    const varSnap = await varRef.get();
                    const newVarQty = (varSnap.data() as any).quantity - item.quantity;
                    await varRef.update({ quantity: newVarQty });
                    const prodSnap = await prodRef.get();
                    const newProdQty = (prodSnap.data() as any).quantity - item.quantity;
                    await prodRef.update({ quantity: newProdQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });
                    await fdb.collection('stock_history').add({ product_id: item.product_id, variation_id: item.variation_id, change_amount: -item.quantity, new_quantity: newVarQty, reason: `Order #${orderRef.id}`, created_at: admin.firestore.FieldValue.serverTimestamp() });
                } else {
                    const prodSnap = await prodRef.get();
                    const newProdQty = (prodSnap.data() as any).quantity - item.quantity;
                    await prodRef.update({ quantity: newProdQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });
                    await fdb.collection('stock_history').add({ product_id: item.product_id, change_amount: -item.quantity, new_quantity: newProdQty, reason: `Order #${orderRef.id}`, created_at: admin.firestore.FieldValue.serverTimestamp() });
                }
            }
            return res.json({ success: true, orderId: orderRef.id });
        }

        if (req.method === 'PUT' && id) {
            const { status, reason } = req.body;
            const updateData: any = { status };
            if (status === 'Cancelled') updateData.cancellation_reason = reason;
            await fdb.collection('orders').doc(id).update(updateData);
            return res.json({ success: true });
        }

        if (req.method === 'DELETE' && id === 'all') {
            const snapshot = await fdb.collection('orders').get();
            const batch = fdb.batch();
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
