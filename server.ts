import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('inventory.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin',
    full_name TEXT,
    email TEXT,
    phone TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    min_stock INTEGER DEFAULT 5,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Add unit_of_measure if it doesn't exist
  PRAGMA table_info(products);
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "admin"');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN full_name TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE products ADD COLUMN unit_of_measure TEXT DEFAULT "pcs"');
} catch (e) {
  // Column already exists
}

try {
  db.exec('ALTER TABLE products ADD COLUMN image_url TEXT');
} catch (e) {
  // Column already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    customer_name TEXT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_date DATETIME,
    status TEXT DEFAULT 'Pending',
    total_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS product_variations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    min_stock INTEGER DEFAULT 5,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
  );
`);

try {
  db.exec('ALTER TABLE products ADD COLUMN has_variations BOOLEAN DEFAULT 0');
} catch (e) {}

try {
  db.exec('ALTER TABLE order_items ADD COLUMN variation_id INTEGER');
} catch (e) {}

try {
  db.exec('ALTER TABLE stock_history ADD COLUMN variation_id INTEGER');
} catch (e) {}

try {
  db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER');
} catch (e) {}

try {
  db.exec('ALTER TABLE orders ADD COLUMN cancellation_reason TEXT');
} catch (e) {}

// Seed admin if not exists (password: admin123 - in a real app use hashing)
const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!admin) {
  db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)').run(
    'admin', 'admin123', 'admin', 'System Admin', 'admin@stockmaster.my'
  );
}

// Seed a client for testing
const client = db.prepare('SELECT * FROM users WHERE username = ?').get('client');
if (!client) {
  db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)').run(
    'client', 'client123', 'client', 'John Doe', 'john@example.com'
  );
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth API
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (user) {
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
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone } = req.body;
    try {
      db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?').run(full_name, email, phone, id);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
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

  // Inventory API
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY updated_at DESC').all();
    const productsWithVariations = products.map((product: any) => {
      if (product.has_variations) {
        const variations = db.prepare('SELECT * FROM product_variations WHERE product_id = ?').all(product.id);
        return { ...product, variations };
      }
      return product;
    });
    res.json(productsWithVariations);
  });

  app.post('/api/products', (req, res) => {
    const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
    
    const hasVariations = variations && variations.length > 0 ? 1 : 0;
    const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
    const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

    try {
      const info = db.prepare(
        'INSERT INTO products (name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, has_variations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(name, sku, category, basePrice, totalQuantity, min_stock || 5, unit_of_measure || 'pcs', image_url, hasVariations);
      
      const productId = info.lastInsertRowid;
      
      if (hasVariations) {
        const insertVariation = db.prepare(
          'INSERT INTO product_variations (product_id, name, sku, price, quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertHistory = db.prepare(
          'INSERT INTO stock_history (product_id, variation_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?, ?)'
        );

        for (const v of variations) {
          const vInfo = insertVariation.run(productId, v.name, v.sku, v.price, v.quantity, v.min_stock || 5);
          insertHistory.run(productId, vInfo.lastInsertRowid, v.quantity, v.quantity, reason || 'Initial stock');
        }
      } else {
        // Log initial stock for simple product
        db.prepare(
          'INSERT INTO stock_history (product_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?)'
        ).run(productId, quantity, quantity, reason || 'Initial stock');
      }

      res.json({ id: productId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, sku, category, price, quantity, min_stock, unit_of_measure, image_url, reason, variations } = req.body;
    
    const hasVariations = variations && variations.length > 0 ? 1 : 0;
    const totalQuantity = hasVariations ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.quantity) || 0), 0) : quantity;
    const basePrice = hasVariations ? Math.min(...variations.map((v: any) => parseFloat(v.price))) : price;

    try {
      const currentProduct = db.prepare('SELECT quantity, has_variations FROM products WHERE id = ?').get(id) as any;
      const oldQuantity = currentProduct?.quantity || 0;
      const changeAmount = totalQuantity - oldQuantity;

      db.prepare(
        'UPDATE products SET name = ?, sku = ?, category = ?, price = ?, quantity = ?, min_stock = ?, unit_of_measure = ?, image_url = ?, has_variations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(name, sku, category, basePrice, totalQuantity, min_stock, unit_of_measure, image_url, hasVariations, id);

      if (hasVariations) {
        const existingVariations = db.prepare('SELECT id, quantity FROM product_variations WHERE product_id = ?').all(id) as any[];
        const existingIds = existingVariations.map(v => v.id);
        const newIds = variations.filter((v: any) => v.id).map((v: any) => v.id);
        
        // Delete removed variations
        const toDelete = existingIds.filter(eid => !newIds.includes(eid));
        if (toDelete.length > 0) {
          db.prepare(`DELETE FROM product_variations WHERE id IN (${toDelete.join(',')})`).run();
        }

        const insertVariation = db.prepare(
          'INSERT INTO product_variations (product_id, name, sku, price, quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const updateVariation = db.prepare(
          'UPDATE product_variations SET name = ?, sku = ?, price = ?, quantity = ?, min_stock = ? WHERE id = ?'
        );
        const insertHistory = db.prepare(
          'INSERT INTO stock_history (product_id, variation_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?, ?)'
        );

        for (const v of variations) {
          if (v.id) {
            // Update existing
            const oldVar = existingVariations.find(ev => ev.id === v.id);
            const varChange = v.quantity - (oldVar?.quantity || 0);
            
            updateVariation.run(v.name, v.sku, v.price, v.quantity, v.min_stock, v.id);
            
            if (varChange !== 0) {
              insertHistory.run(id, v.id, varChange, v.quantity, reason || 'Manual update');
            }
          } else {
            // Insert new
            const info = insertVariation.run(id, v.name, v.sku, v.price, v.quantity, v.min_stock || 5);
            insertHistory.run(id, info.lastInsertRowid, v.quantity, v.quantity, reason || 'New variation');
          }
        }
      } else if (changeAmount !== 0) {
        db.prepare(
          'INSERT INTO stock_history (product_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?)'
        ).run(id, changeAmount, quantity, reason || 'Manual update');
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/products/:id/history', (req, res) => {
    const { id } = req.params;
    const history = db.prepare('SELECT * FROM stock_history WHERE product_id = ? ORDER BY created_at DESC').all(id);
    res.json(history);
  });

  app.post('/api/products/bulk', (req, res) => {
    const products = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Invalid data format' });

    const insertProduct = db.prepare(
      'INSERT INTO products (name, sku, category, price, quantity, min_stock, unit_of_measure) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertHistory = db.prepare(
      'INSERT INTO stock_history (product_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?)'
    );

    const transaction = db.transaction((items) => {
      for (const item of items) {
        const info = insertProduct.run(
          item.name, 
          item.sku, 
          item.category || 'Others', 
          item.price || 0, 
          item.quantity || 0, 
          item.min_stock || 5,
          item.unit_of_measure || 'pcs'
        );
        const productId = info.lastInsertRowid;
        insertHistory.run(productId, item.quantity || 0, item.quantity || 0, 'Bulk Import');
      }
    });

    try {
      transaction(products);
      res.json({ success: true, count: products.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/bulk-update', (req, res) => {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No products selected' });

    const allowedFields = ['category', 'min_stock', 'unit_of_measure'];
    const updateFields = Object.keys(updates).filter(f => allowedFields.includes(f));
    
    if (updateFields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const setClause = updateFields.map(f => `${f} = ?`).join(', ');
    const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const stmt = db.prepare(query);

    const transaction = db.transaction((productIds, data) => {
      const values = updateFields.map(f => data[f]);
      for (const id of productIds) {
        stmt.run(...values, id);
      }
    });

    try {
      transaction(ids, updates);
      res.json({ success: true, count: ids.length });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/adjust', (req, res) => {
    const { id } = req.params;
    const { amount, reason, variation_id } = req.body;
    
    try {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (product.has_variations) {
        if (!variation_id) {
          return res.status(400).json({ error: 'Variation ID is required for products with variations' });
        }
        
        const variation = db.prepare('SELECT * FROM product_variations WHERE id = ? AND product_id = ?').get(variation_id, id) as any;
        if (!variation) return res.status(404).json({ error: 'Variation not found' });

        const newVariationQuantity = variation.quantity + amount;
        if (newVariationQuantity < 0) return res.status(400).json({ error: 'Variation stock cannot be negative' });

        const updateTx = db.transaction(() => {
          // Update variation quantity
          db.prepare('UPDATE product_variations SET quantity = ? WHERE id = ?').run(newVariationQuantity, variation_id);
          
          // Update total product quantity
          const totalQty = db.prepare('SELECT SUM(quantity) as total FROM product_variations WHERE product_id = ?').get(id) as any;
          const newTotal = totalQty.total || 0;
          db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newTotal, id);

          // Log history
          db.prepare(
            'INSERT INTO stock_history (product_id, variation_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?, ?)'
          ).run(id, variation_id, amount, newVariationQuantity, reason || 'Manual adjustment');
          
          return newTotal;
        });

        const newTotal = updateTx();
        return res.json({ success: true, newQuantity: newTotal, newVariationQuantity });
      } else {
        const newQuantity = product.quantity + amount;
        if (newQuantity < 0) return res.status(400).json({ error: 'Stock cannot be negative' });

        db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQuantity, id);
        
        db.prepare(
          'INSERT INTO stock_history (product_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?)'
        ).run(id, amount, newQuantity, reason || 'Manual adjustment');

        return res.json({ success: true, newQuantity });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Orders API
  app.get('/api/orders', (req, res) => {
    const { userId, role, includeItems } = req.query;
    let orders: any[];
    if (role === 'client' && userId) {
      orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC').all(userId);
    } else {
      orders = db.prepare('SELECT * FROM orders ORDER BY order_date DESC').all();
    }

    if (includeItems === 'true') {
      orders = orders.map(order => {
        const items = db.prepare(`
          SELECT oi.*, p.name as product_name, p.sku as product_sku, p.image_url as product_image,
          pv.name as variation_name, pv.sku as variation_sku
          FROM order_items oi 
          JOIN products p ON oi.product_id = p.id 
          LEFT JOIN product_variations pv ON oi.variation_id = pv.id
          WHERE oi.order_id = ?
        `).all(order.id);
        return { ...order, items };
      });
    }

    res.json(orders);
  });

  app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.sku as product_sku, p.image_url as product_image,
      pv.name as variation_name, pv.sku as variation_sku
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      LEFT JOIN product_variations pv ON oi.variation_id = pv.id
      WHERE oi.order_id = ?
    `).all(id);
    
    res.json({ ...order, items });
  });

  app.post('/api/orders', (req, res) => {
    const { customer_name, delivery_date, items, user_id } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    const insertOrder = db.prepare(
      'INSERT INTO orders (customer_name, delivery_date, total_amount, user_id) VALUES (?, ?, ?, ?)'
    );
    const insertOrderItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, variation_id, quantity, price_at_order) VALUES (?, ?, ?, ?, ?)'
    );
    const updateProductStock = db.prepare(
      'UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    const updateVariationStock = db.prepare(
      'UPDATE product_variations SET quantity = quantity - ? WHERE id = ?'
    );
    const insertStockHistory = db.prepare(
      'INSERT INTO stock_history (product_id, variation_id, change_amount, new_quantity, reason) VALUES (?, ?, ?, ?, ?)'
    );

    const transaction = db.transaction((orderData) => {
      let totalAmount = 0;
      // Calculate total first and check stock
      for (const item of orderData.items) {
        if (item.variation_id) {
          const variation = db.prepare('SELECT quantity, price, name, product_id FROM product_variations WHERE id = ?').get(item.variation_id) as any;
          if (!variation) throw new Error(`Variation ${item.variation_id} not found`);
          if (variation.quantity < item.quantity) throw new Error(`Insufficient stock for ${variation.name}`);
          totalAmount += variation.price * item.quantity;
        } else {
          const product = db.prepare('SELECT quantity, price, name FROM products WHERE id = ?').get(item.product_id) as any;
          if (!product) throw new Error(`Product ${item.product_id} not found`);
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
          totalAmount += product.price * item.quantity;
        }
      }

      const info = insertOrder.run(orderData.customer_name, orderData.delivery_date, totalAmount, orderData.user_id);
      const orderId = info.lastInsertRowid;

      for (const item of orderData.items) {
        if (item.variation_id) {
          const variation = db.prepare('SELECT quantity, price, product_id FROM product_variations WHERE id = ?').get(item.variation_id) as any;
          insertOrderItem.run(orderId, variation.product_id, item.variation_id, item.quantity, variation.price);
          
          // Update variation stock
          updateVariationStock.run(item.quantity, item.variation_id);
          const newVarQuantity = variation.quantity - item.quantity;
          insertStockHistory.run(variation.product_id, item.variation_id, -item.quantity, newVarQuantity, `Order #${orderId}`);

          // Update parent product stock (aggregate)
          updateProductStock.run(item.quantity, variation.product_id);
        } else {
          const product = db.prepare('SELECT quantity, price FROM products WHERE id = ?').get(item.product_id) as any;
          insertOrderItem.run(orderId, item.product_id, null, item.quantity, product.price);
          updateProductStock.run(item.quantity, item.product_id);
          
          const newQuantity = product.quantity - item.quantity;
          insertStockHistory.run(item.product_id, null, -item.quantity, newQuantity, `Order #${orderId}`);
        }
      }
      return orderId;
    });

    try {
      const orderId = transaction({ customer_name, delivery_date, items, user_id });
      res.json({ success: true, orderId });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      if (status === 'Cancelled') {
        db.prepare('UPDATE orders SET status = ?, cancellation_reason = ? WHERE id = ?').run(status, reason, id);
      } else {
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
      }
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
