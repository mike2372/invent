import { fdb, mapDoc, admin } from './_firebase.js';

export default async function handler(req: any, res: any) {
    const idRaw = req.query.id as string || '';
    const parts = idRaw.split('/');
    const id = parts[0];
    const action = parts[1];

    try {
        if (req.method === 'GET') {
            if (id) {
                if (action === 'history') {
                    const snapshot = await fdb.collection('stock_history')
                        .where('product_id', '==', id)
                        .orderBy('created_at', 'desc')
                        .get();
                    return res.json(snapshot.docs.map(mapDoc));
                }
                const doc = await fdb.collection('products').doc(id).get();
                if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
                return res.json(mapDoc(doc));
            }
            const snapshot = await fdb.collection('products').orderBy('updated_at', 'desc').get();
            const products = await Promise.all(snapshot.docs.map(async doc => {
                const product = mapDoc(doc) as any;
                if (product.has_variations) {
                    const varSnapshot = await doc.ref.collection('variations').get();
                    const variations = varSnapshot.docs.map(mapDoc);
                    return { ...product, variations };
                }
                return product;
            }));
            return res.json(products);
        }

        if (req.method === 'POST') {
            if (id && action === 'adjust') {
                const { amount, reason, variation_id } = req.body;
                const productRef = fdb.collection('products').doc(id);
                const productDoc = await productRef.get();
                if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });
                const product = productDoc.data() as any;

                if (product.has_variations) {
                    if (!variation_id) return res.status(400).json({ error: 'Variation ID is required' });
                    const varRef = productRef.collection('variations').doc(variation_id);
                    const varDoc = await varRef.get();
                    if (!varDoc.exists) return res.status(404).json({ error: 'Variation not found' });
                    const variation = varDoc.data() as any;

                    const newVarQty = (variation.quantity || 0) + amount;
                    if (newVarQty < 0) return res.status(400).json({ error: 'Stock cannot be negative' });

                    await varRef.update({ quantity: newVarQty });
                    const allVars = await productRef.collection('variations').get();
                    const newTotal = allVars.docs.reduce((acc, d) => acc + (d.data().quantity || 0), 0);
                    await productRef.update({ quantity: newTotal, updated_at: admin.firestore.FieldValue.serverTimestamp() });

                    await fdb.collection('stock_history').add({
                        product_id: id,
                        variation_id,
                        change_amount: amount,
                        new_quantity: newVarQty,
                        reason: reason || 'Manual adjustment',
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                    return res.json({ success: true, newQuantity: newTotal, newVariationQuantity: newVarQty });
                } else {
                    const newQty = (product.quantity || 0) + amount;
                    if (newQty < 0) return res.status(400).json({ error: 'Stock cannot be negative' });
                    await productRef.update({ quantity: newQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });
                    await fdb.collection('stock_history').add({
                        product_id: id,
                        change_amount: amount,
                        new_quantity: newQty,
                        reason: reason || 'Manual adjustment',
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                    return res.json({ success: true, newQuantity: newQty });
                }
            }

            const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
            const hasVariations = variations && variations.length > 0;
            const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
            const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

            const newProduct = {
                name, sku, category,
                price: basePrice,
                quantity: totalQuantity,
                min_stock: min_stock || 5,
                unit_of_measure: unit_of_measure || 'pcs',
                image_url,
                has_variations: hasVariations,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };
            const productRef = await fdb.collection('products').add(newProduct);

            if (hasVariations) {
                for (const v of variations) {
                    const vRef = await productRef.collection('variations').add({
                        name: v.name, sku: v.sku, price: v.price, quantity: v.quantity, min_stock: v.min_stock || 5
                    });
                    await fdb.collection('stock_history').add({
                        product_id: productRef.id,
                        variation_id: vRef.id,
                        change_amount: v.quantity,
                        new_quantity: v.quantity,
                        reason: reason || 'Initial stock',
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } else {
                await fdb.collection('stock_history').add({
                    product_id: productRef.id,
                    change_amount: quantity,
                    new_quantity: quantity,
                    reason: reason || 'Initial stock',
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            return res.json({ id: productRef.id });
        }

        if (req.method === 'PUT' && id) {
            const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
            const hasVariations = variations && variations.length > 0;
            const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
            const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

            const productRef = fdb.collection('products').doc(id);
            const doc = await productRef.get();
            const currentProduct = doc.data() as any;
            const oldQuantity = currentProduct?.quantity || 0;
            const changeAmount = totalQuantity - oldQuantity;

            await productRef.update({
                name, sku, category,
                price: basePrice,
                quantity: totalQuantity,
                min_stock, unit_of_measure, image_url,
                has_variations: hasVariations,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            if (hasVariations) {
                const varsRef = productRef.collection('variations');
                const existingVarsSnapshot = await varsRef.get();
                const existingVars = existingVarsSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
                const newIds = variations.filter((v: any) => v.id).map((v: any) => v.id);
                for (const ev of existingVars) {
                    if (!newIds.includes(ev.id)) await varsRef.doc(ev.id).delete();
                }
                for (const v of variations) {
                    if (v.id) {
                        const oldVar = existingVars.find(ev => ev.id === v.id);
                        const varChange = (v.quantity || 0) - (oldVar?.quantity || 0);
                        await varsRef.doc(v.id).update({
                            name: v.name, sku: v.sku, price: v.price, quantity: v.quantity, min_stock: v.min_stock
                        });
                        if (varChange !== 0) {
                            await fdb.collection('stock_history').add({
                                product_id: id, variation_id: v.id, change_amount: varChange, new_quantity: v.quantity,
                                reason: reason || 'Manual update', created_at: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    } else {
                        const vRef = await varsRef.add({
                            name: v.name, sku: v.sku, price: v.price, quantity: v.quantity, min_stock: v.min_stock || 5
                        });
                        await fdb.collection('stock_history').add({
                            product_id: id, variation_id: vRef.id, change_amount: v.quantity, new_quantity: v.quantity,
                            reason: reason || 'New variation', created_at: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            } else if (changeAmount !== 0) {
                await fdb.collection('stock_history').add({
                    product_id: id, change_amount: changeAmount, new_quantity: quantity,
                    reason: reason || 'Manual update', created_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            return res.json({ success: true });
        }

        if (req.method === 'DELETE' && id) {
            if (id === 'all') {
                // Bulk delete products is not standard here but added for completeness
            }
            await fdb.collection('products').doc(id).delete();
            return res.json({ success: true });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
