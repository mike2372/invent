import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
} else {
  console.warn('FIREBASE_PROJECT_ID not found in .env. Please configure Firebase to use the backend.');
}

const fdb = admin.firestore();

// Seed initial admin user if collection is empty
async function seedAdmin() {
  const usersRef = fdb.collection('users');
  const snapshot = await usersRef.where('username', '==', 'admin').get();
  if (snapshot.empty) {
    await usersRef.add({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      full_name: 'System Admin',
      email: 'admin@stockmaster.my',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Seeded admin user');
  }
}

if (process.env.FIREBASE_PROJECT_ID) {
  seedAdmin().catch(console.error);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Helper to map Firestore docs to objects with ID
  const mapDoc = (doc: admin.firestore.DocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  });

  // Auth API
  app.post('/api/login', async (req, res) => {
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
  });

  app.post('/api/guest-login', async (req, res) => {
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
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone } = req.body;
    try {
      await fdb.collection('users').doc(id).update({ full_name, email, phone });
      const doc = await fdb.collection('users').doc(id).get();
      const user = mapDoc(doc) as any;
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
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const snapshot = await fdb.collection('users').where('role', '==', 'client').get();
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username,
          role: data.role,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone
        };
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, full_name, email, phone, role } = req.body;
    try {
      const docRef = await fdb.collection('users').add({
        username, password, full_name, email, phone,
        role: role || 'client',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, id: docRef.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const batch = fdb.batch();

      // Nullify user_id on any orders
      const ordersSnapshot = await fdb.collection('orders').where('user_id', '==', id).get();
      ordersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { user_id: null });
      });

      batch.delete(fdb.collection('users').doc(id));
      await batch.commit();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Clear all orders (admin only)
  app.delete('/api/orders/all', async (req, res) => {
    try {
      // In a real app with many orders, you'd need a recursive delete for subcollections
      // and batching for large collections. This is a simplified version.
      const ordersSnapshot = await fdb.collection('orders').get();
      const batch = fdb.batch();
      ordersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      // We also need to clear items, but in this Firestore schema items will be subcollections or embedded
      await batch.commit();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Inventory API
  app.get('/api/products', async (req, res) => {
    try {
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
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
    const hasVariations = variations && variations.length > 0 ? true : false;
    const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
    const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

    try {
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
            name: v.name,
            sku: v.sku,
            price: v.price,
            quantity: v.quantity,
            min_stock: v.min_stock || 5
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

      res.json({ id: productRef.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
    const hasVariations = variations && variations.length > 0 ? true : false;
    const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
    const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

    try {
      const productRef = fdb.collection('products').doc(id);
      const doc = await productRef.get();
      const currentProduct = doc.data() as any;
      const oldQuantity = currentProduct?.quantity || 0;
      const changeAmount = totalQuantity - oldQuantity;

      await productRef.update({
        name, sku, category,
        price: basePrice,
        quantity: totalQuantity,
        min_stock,
        unit_of_measure,
        image_url,
        has_variations: hasVariations,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      if (hasVariations) {
        // This part is more complex in Firestore. We need to sync variations.
        const varsRef = productRef.collection('variations');
        const existingVarsSnapshot = await varsRef.get();
        const existingVars = existingVarsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        const newIds = variations.filter((v: any) => v.id).map((v: any) => v.id);

        // Delete removed
        for (const ev of existingVars) {
          if (!newIds.includes(ev.id)) {
            await varsRef.doc(ev.id).delete();
          }
        }

        for (const v of variations) {
          if (v.id) {
            const oldVar = existingVars.find(ev => ev.id === v.id);
            const varChange = v.quantity - (oldVar?.quantity || 0);
            await varsRef.doc(v.id).update({
              name: v.name, sku: v.sku, price: v.price, quantity: v.quantity, min_stock: v.min_stock
            });
            if (varChange !== 0) {
              await fdb.collection('stock_history').add({
                product_id: id,
                variation_id: v.id,
                change_amount: varChange,
                new_quantity: v.quantity,
                reason: reason || 'Manual update',
                created_at: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          } else {
            const vRef = await varsRef.add({
              name: v.name, sku: v.sku, price: v.price, quantity: v.quantity, min_stock: v.min_stock || 5
            });
            await fdb.collection('stock_history').add({
              product_id: id,
              variation_id: vRef.id,
              change_amount: v.quantity,
              new_quantity: v.quantity,
              reason: reason || 'New variation',
              created_at: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } else if (changeAmount !== 0) {
        await fdb.collection('stock_history').add({
          product_id: id,
          change_amount: changeAmount,
          new_quantity: quantity,
          reason: reason || 'Manual update',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/products/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
      const snapshot = await fdb.collection('stock_history')
        .where('product_id', '==', id)
        .orderBy('created_at', 'desc')
        .get();
      const history = snapshot.docs.map(mapDoc);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products/bulk', async (req, res) => {
    const products = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Invalid data format' });

    try {
      const batch = fdb.batch();
      for (const item of products) {
        const prodRef = fdb.collection('products').doc();
        batch.set(prodRef, {
          name: item.name,
          sku: item.sku,
          category: item.category || 'Others',
          price: item.price || 0,
          quantity: item.quantity || 0,
          min_stock: item.min_stock || 5,
          unit_of_measure: item.unit_of_measure || 'pcs',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        const histRef = fdb.collection('stock_history').doc();
        batch.set(histRef, {
          product_id: prodRef.id,
          change_amount: item.quantity || 0,
          new_quantity: item.quantity || 0,
          reason: 'Bulk Import',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      res.json({ success: true, count: products.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/bulk-update', async (req, res) => {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No products selected' });

    try {
      const batch = fdb.batch();
      for (const id of ids) {
        const ref = fdb.collection('products').doc(id);
        batch.update(ref, {
          ...updates,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      res.json({ success: true, count: ids.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/adjust', async (req, res) => {
    const { id } = req.params;
    const { amount, reason, variation_id } = req.body;

    try {
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

        const newVarQty = variation.quantity + amount;
        if (newVarQty < 0) return res.status(400).json({ error: 'Stock cannot be negative' });

        await varRef.update({ quantity: newVarQty });

        // Recalculate total
        const allVars = await productRef.collection('variations').get();
        const newTotal = allVars.docs.reduce((acc, doc) => acc + (doc.data().quantity || 0), 0);
        await productRef.update({ quantity: newTotal, updated_at: admin.firestore.FieldValue.serverTimestamp() });

        await fdb.collection('stock_history').add({
          product_id: id,
          variation_id,
          change_amount: amount,
          new_quantity: newVarQty,
          reason: reason || 'Manual adjustment',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, newQuantity: newTotal, newVariationQuantity: newVarQty });
      } else {
        const newQty = product.quantity + amount;
        if (newQty < 0) return res.status(400).json({ error: 'Stock cannot be negative' });

        await productRef.update({ quantity: newQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });

        await fdb.collection('stock_history').add({
          product_id: id,
          change_amount: amount,
          new_quantity: newQty,
          reason: reason || 'Manual adjustment',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, newQuantity: newQty });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await fdb.collection('products').doc(id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Orders API
  app.get('/api/orders', async (req, res) => {
    const { userId, role, includeItems } = req.query;
    try {
      let query: admin.firestore.Query = fdb.collection('orders').orderBy('order_date', 'desc');

      if (role === 'client' && userId) {
        query = query.where('user_id', '==', userId);
      }

      const snapshot = await query.get();
      const orders = await Promise.all(snapshot.docs.map(async doc => {
        const order = mapDoc(doc) as any;
        if (includeItems === 'true') {
          const itemsSnapshot = await doc.ref.collection('items').get();
          order.items = itemsSnapshot.docs.map(mapDoc);
        }
        return order;
      }));
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const doc = await fdb.collection('orders').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Order not found' });

      const order = mapDoc(doc) as any;
      const itemsSnapshot = await doc.ref.collection('items').get();
      order.items = itemsSnapshot.docs.map(mapDoc);

      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    const { customer_name, delivery_date, items, user_id } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    try {
      let totalAmount = 0;
      const itemDetails = [];

      // Validate stock and calculate total
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
          itemDetails.push({
            ...item,
            price_at_order: variation.price,
            product_name: product.name,
            variation_name: variation.name,
            variation_sku: variation.sku
          });
        } else {
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
          totalAmount += product.price * item.quantity;
          itemDetails.push({
            ...item,
            price_at_order: product.price,
            product_name: product.name,
            product_sku: product.sku
          });
        }
      }

      const orderRef = await fdb.collection('orders').add({
        customer_name,
        delivery_date,
        total_amount: totalAmount,
        user_id,
        status: 'Pending',
        order_date: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      for (const item of itemDetails) {
        await orderRef.collection('items').add(item);

        const prodRef = fdb.collection('products').doc(item.product_id);
        if (item.variation_id) {
          const varRef = prodRef.collection('variations').doc(item.variation_id);
          const varSnap = await varRef.get();
          const oldVarQty = (varSnap.data() as any).quantity;
          const newVarQty = oldVarQty - item.quantity;

          await varRef.update({ quantity: newVarQty });

          const prodSnap = await prodRef.get();
          const newProdQty = (prodSnap.data() as any).quantity - item.quantity;
          await prodRef.update({ quantity: newProdQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });

          await fdb.collection('stock_history').add({
            product_id: item.product_id,
            variation_id: item.variation_id,
            change_amount: -item.quantity,
            new_quantity: newVarQty,
            reason: `Order #${orderRef.id}`,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          const prodSnap = await prodRef.get();
          const newProdQty = (prodSnap.data() as any).quantity - item.quantity;
          await prodRef.update({ quantity: newProdQty, updated_at: admin.firestore.FieldValue.serverTimestamp() });

          await fdb.collection('stock_history').add({
            product_id: item.product_id,
            change_amount: -item.quantity,
            new_quantity: newProdQty,
            reason: `Order #${orderRef.id}`,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      res.json({ success: true, orderId: orderRef.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    try {
      const updateData: any = { status };
      if (status === 'Cancelled') updateData.cancellation_reason = reason;

      await fdb.collection('orders').doc(id).update(updateData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
