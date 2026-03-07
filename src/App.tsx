import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  LogOut, 
  AlertTriangle,
  TrendingUp,
  Box,
  DollarSign,
  ChevronRight,
  X,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Download,
  Upload,
  FileText,
  CheckSquare,
  Square,
  Settings2,
  ShoppingCart,
  Truck,
  Calendar,
  User as UserIcon,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User, StockHistory, Order, OrderItem } from './types';
import { PRODUCT_CATEGORIES, UNIT_OPTIONS } from './constants';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('stockmaster_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'client_dashboard'>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<'30_days' | '3_months' | '6_months' | '1_year' | 'all_time'>('all_time');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    quantity: '',
    min_stock: '5',
    unit_of_measure: 'pcs',
    image_url: '',
    reason: '',
    has_variations: false,
    variations: [] as { id?: number, name: string, sku: string, price: string, quantity: string, min_stock: string }[]
  });
  const [orderFormData, setOrderFormData] = useState({
    customer_name: '',
    delivery_date: '',
    items: [] as { product_id: number, variation_id?: number, quantity: number }[]
  });
  const [bulkFormData, setBulkFormData] = useState({
    category: '',
    min_stock: '',
    unit_of_measure: '',
    updateCategory: false,
    updateMinStock: false,
    updateUnit: false
  });
  const [adjustData, setAdjustData] = useState({
    amount: '',
    reason: 'Restock',
    variation_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);

  const openProfileEdit = () => {
    setProfileFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsProfileModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileFormData)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('stockmaster_user', JSON.stringify(data.user));
        setIsProfileModalOpen(false);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
      if (user.role === 'client') {
        setActiveTab('client_dashboard');
      }
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
      setSelectedIds([]); // Clear selection on refresh
    } catch (err) {
      console.error('Failed to fetch products');
    }
  };

  const fetchOrders = async () => {
    try {
      const queryParams = new URLSearchParams({
        userId: user?.id.toString() || '',
        role: user?.role || '',
        includeItems: 'true'
      });
      const res = await fetch(`/api/orders?${queryParams}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders');
    }
  };

  const fetchOrderDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      setSelectedOrder(data);
      setIsOrderDetailsOpen(true);
    } catch (err) {
      console.error('Failed to fetch order details');
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;
    
    const headers = ['Name', 'SKU', 'Category', 'Price (RM)', 'Quantity', 'Unit', 'Min Stock'];
    const rows = products.map(p => [
      p.name,
      p.sku,
      p.category,
      p.price.toFixed(2),
      p.quantity,
      p.unit_of_measure,
      p.min_stock
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return; // Header only or empty

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const importedProducts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return {
          name: values[0],
          sku: values[1],
          category: values[2],
          price: parseFloat(values[3]),
          quantity: parseInt(values[4]),
          unit_of_measure: values[5] || 'pcs',
          min_stock: parseInt(values[6] || '5')
        };
      });

      setLoading(true);
      try {
        const res = await fetch('/api/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedProducts)
        });
        if (res.ok) {
          alert(`Successfully imported ${importedProducts.length} products`);
          fetchProducts();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to import products');
        }
      } catch (err) {
        console.error('Import failed');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    
    const updates: any = {};
    if (bulkFormData.updateCategory) updates.category = bulkFormData.category;
    if (bulkFormData.updateMinStock) updates.min_stock = parseInt(bulkFormData.min_stock);
    if (bulkFormData.updateUnit) updates.unit_of_measure = bulkFormData.unit_of_measure;

    if (Object.keys(updates).length === 0) {
      alert('Please select at least one field to update');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        setIsBulkModalOpen(false);
        setSelectedIds([]);
        setBulkFormData({
          category: '',
          min_stock: '',
          unit_of_measure: '',
          updateCategory: false,
          updateMinStock: false,
          updateUnit: false
        });
        fetchProducts();
      }
    } catch (err) {
      console.error('Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const fetchHistory = async (product: Product) => {
    setHistoryLoading(true);
    setHistoryProduct(product);
    setIsHistoryOpen(true);
    try {
      const res = await fetch(`/api/products/${product.id}/history`);
      const data = await res.json();
      setStockHistory(data);
    } catch (err) {
      console.error('Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('stockmaster_user', JSON.stringify(data.user));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('stockmaster_user');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price) || 0,
          quantity: parseInt(formData.quantity) || 0,
          min_stock: parseInt(formData.min_stock) || 0,
          variations: formData.has_variations ? formData.variations.map(v => ({
            ...v,
            price: parseFloat(v.price) || 0,
            quantity: parseInt(v.quantity) || 0,
            min_stock: parseInt(v.min_stock) || 0
          })) : []
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ 
          name: '', sku: '', category: '', price: '', quantity: '', min_stock: '5', unit_of_measure: 'pcs', image_url: '', reason: '',
          has_variations: false, variations: []
        });
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    setLoading(true);
    try {
      const payload: any = {
        amount: parseInt(adjustData.amount),
        reason: adjustData.reason
      };
      if (adjustData.variation_id) {
        payload.variation_id = parseInt(adjustData.variation_id);
      }

      const res = await fetch(`/api/products/${adjustProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAdjustModalOpen(false);
        setAdjustProduct(null);
        setAdjustData({ amount: '', reason: 'Restock', variation_id: '' });
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to adjust stock');
      }
    } catch (err) {
      console.error('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderFormData.items.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderFormData,
          user_id: user?.id
        })
      });
      if (res.ok) {
        setIsOrderModalOpen(false);
        setOrderFormData({ customer_name: '', delivery_date: '', items: [] });
        fetchProducts();
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (id: number, status: string) => {
    if (status === 'Cancelled') {
      setOrderToCancel(id);
      setIsCancellationModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === id) {
          fetchOrderDetails(id);
        }
      }
    } catch (err) {
      console.error('Failed to update order status');
    }
  };

  const confirmCancellation = async () => {
    if (!orderToCancel) return;
    
    try {
      const res = await fetch(`/api/orders/${orderToCancel}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled', reason: cancellationReason })
      });
      
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderToCancel) {
          fetchOrderDetails(orderToCancel);
        }
        setIsCancellationModalOpen(false);
        setCancellationReason('');
        setOrderToCancel(null);
      }
    } catch (err) {
      console.error('Failed to cancel order');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product');
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      min_stock: product.min_stock.toString(),
      unit_of_measure: product.unit_of_measure || 'pcs',
      image_url: product.image_url || '',
      reason: '',
      has_variations: product.has_variations || false,
      variations: product.variations ? product.variations.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price.toString(),
        quantity: v.quantity.toString(),
        min_stock: v.min_stock.toString()
      })) : []
    });
    setIsModalOpen(true);
  };

  const openAdjust = (product: Product) => {
    setAdjustProduct(product);
    setAdjustData({ amount: '', reason: 'Restock' });
    setIsAdjustModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) || 
    o.id.toString().includes(orderSearch) ||
    o.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.items && o.items.some(item => 
      (item.product_name && item.product_name.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (item.product_sku && item.product_sku.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (item.variation_name && item.variation_name.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (item.variation_sku && item.variation_sku.toLowerCase().includes(orderSearch.toLowerCase()))
    ))
  );

  const stats = {
    totalItems: products.length,
    totalStock: products.reduce((acc, p) => acc + p.quantity, 0),
    totalValue: products.reduce((acc, p) => acc + (p.price * p.quantity), 0),
    lowStock: products.filter(p => p.quantity <= p.min_stock).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'Pending').length,
    totalRevenue: orders.reduce((acc, o) => acc + o.total_amount, 0)
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-neutral-200"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
              <Box className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">StockMaster MY</h1>
            <p className="text-neutral-500 text-sm">Inventory Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="admin"
                value={loginData.username}
                onChange={e => setLoginData({...loginData, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-neutral-400">
            Default credentials: admin / admin123
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="p-6 border-bottom border-neutral-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Box className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-neutral-900">StockMaster</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {user.role === 'admin' ? (
            <>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutDashboard size={20} />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <Package size={20} />
                <span className="flex-1 text-left">Inventory</span>
                {stats.lowStock > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats.lowStock}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <ShoppingCart size={20} />
                Orders
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('client_dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'client_dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutDashboard size={20} />
                My Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <ShoppingCart size={20} />
                My Orders
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeTab === 'client_dashboard' && user.role === 'client' && (
          <div className="space-y-8">
            <header>
              <h1 className="text-2xl font-bold text-neutral-900">My Dashboard</h1>
              <p className="text-neutral-500">Welcome back, {user.full_name || user.username}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                      <UserIcon size={32} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900">{user.full_name || 'N/A'}</h2>
                      <p className="text-sm text-neutral-500">Client Account</p>
                    </div>
                  </div>
                  <button 
                    onClick={openProfileEdit}
                    className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Email</label>
                    <p className="text-neutral-900">{user.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Phone</label>
                    <p className="text-neutral-900">{user.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Username</label>
                    <p className="text-neutral-900">{user.username}</p>
                  </div>
                </div>
              </div>

              {/* Order Stats */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                    <ShoppingCart size={24} />
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">Total Orders</p>
                  <h3 className="text-2xl font-bold text-neutral-900 mt-1">{orders.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                    <DollarSign size={24} />
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">Total Spent</p>
                  <h3 className="text-2xl font-bold text-neutral-900 mt-1">
                    RM {orders.reduce((acc, o) => acc + o.total_amount, 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Purchased Products Chart */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-neutral-900">Top Purchased Products</h2>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <option value="30_days">Last 30 Days</option>
                  <option value="3_months">Last 3 Months</option>
                  <option value="6_months">Last 6 Months</option>
                  <option value="1_year">Last Year</option>
                  <option value="all_time">All Time</option>
                </select>
              </div>
              <div className="p-6">
                {(() => {
                  const now = new Date();
                  const filteredOrders = orders.filter(order => {
                    if (selectedPeriod === 'all_time') return true;
                    const orderDate = new Date(order.order_date);
                    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    switch (selectedPeriod) {
                      case '30_days': return diffDays <= 30;
                      case '3_months': return diffDays <= 90;
                      case '6_months': return diffDays <= 180;
                      case '1_year': return diffDays <= 365;
                      default: return true;
                    }
                  });

                  const allItems = filteredOrders.flatMap(o => o.items || []);
                  const productStatsMap = new Map<number, { pid: number, name: string, sku: string, image?: string, totalQty: number }>();

                  allItems.forEach(item => {
                    const existing = productStatsMap.get(item.product_id);
                    if (existing) {
                      existing.totalQty += item.quantity;
                    } else {
                      productStatsMap.set(item.product_id, {
                        pid: item.product_id,
                        name: item.product_name || 'Unknown',
                        sku: item.product_sku || '',
                        image: item.product_image,
                        totalQty: item.quantity
                      });
                    }
                  });

                  const productStats = Array.from(productStatsMap.values())
                    .sort((a, b) => b.totalQty - a.totalQty)
                    .slice(0, 10);

                  if (productStats.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p>No purchase data available for this period.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12, fill: '#737373' }} 
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#737373' }} 
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip 
                              cursor={{ fill: '#F5F5F5' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="totalQty" name="Quantity" radius={[4, 4, 0, 0]}>
                              {productStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index < 3 ? '#059669' : '#34D399'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productStats.map((stat, index) => (
                          <div key={stat.pid} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 transition-colors hover:bg-emerald-50/50">
                            {stat.image ? (
                              <img 
                                src={stat.image} 
                                alt={stat.name} 
                                className="w-12 h-12 object-cover rounded-lg border border-neutral-200 bg-white"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-neutral-200 text-emerald-600">
                                <Package size={24} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-neutral-900 truncate">{stat.name}</p>
                              <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200">{stat.sku}</span>
                                <span>{stat.totalQty} units</span>
                              </div>
                            </div>
                            <div className="text-emerald-600 font-bold text-lg opacity-50">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Recent Orders Summary */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100">
                <h2 className="text-lg font-bold text-neutral-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-neutral-200 text-neutral-400">
                            <ClipboardList size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900">Order #{order.id.toString().padStart(5, '0')}</p>
                            <p className="text-xs text-neutral-500">{new Date(order.order_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-neutral-900">RM {order.total_amount.toFixed(2)}</p>
                          <span className={`text-[10px] font-bold uppercase ${
                            order.status === 'Delivered' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-neutral-500 py-8">No orders yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user.role === 'admin' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
                <p className="text-neutral-500">Welcome back, {user.username}</p>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Products', value: stats.totalItems, icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total Stock', value: stats.totalStock, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Inventory Value', value: `RM ${stats.totalValue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Pending Orders', value: stats.pendingOrders, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Total Revenue', value: `RM ${stats.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.bg} p-3 rounded-xl`}>
                      <stat.icon className={stat.color} size={24} />
                    </div>
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-neutral-900 mt-1">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            {/* Low Stock Alerts */}
            {stats.lowStock > 0 && (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Low Stock Alerts</h2>
                    <p className="text-sm text-neutral-500">The following items are below their minimum stock level</p>
                  </div>
                </div>
                <div className="divide-y divide-neutral-100">
                  {products.filter(p => p.quantity <= p.min_stock).map(product => (
                    <div key={product.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded-lg border border-neutral-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                            <Package size={20} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-neutral-900">{product.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-neutral-500">
                            <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 text-xs">{product.sku}</span>
                            <span>•</span>
                            <span>Min Stock: {product.min_stock}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Current Stock</p>
                          <p className="font-bold text-red-600 text-lg">{product.quantity} <span className="text-sm text-neutral-400 font-normal">{product.unit_of_measure}</span></p>
                        </div>
                        <button 
                          onClick={() => openAdjust(product)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-100 flex items-center gap-2"
                        >
                          <ArrowUpDown size={16} />
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'inventory' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Inventory Management</h1>
                <p className="text-neutral-500">Manage your products and stock levels</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setIsBulkModalOpen(true)}
                    className="bg-amber-100 text-amber-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-amber-200 transition-all shadow-sm border border-amber-200"
                  >
                    <Settings2 size={20} />
                    Bulk Actions ({selectedIds.length})
                  </motion.button>
                )}
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-neutral-50 transition-all shadow-sm"
                >
                  <Upload size={20} />
                  Import CSV
                </button>
                <button 
                  onClick={exportToCSV}
                  className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-neutral-50 transition-all shadow-sm"
                >
                  <Download size={20} />
                  Export CSV
                </button>
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    setFormData({ name: '', sku: '', category: '', price: '', quantity: '', min_stock: '5', unit_of_measure: 'pcs', image_url: '', reason: '' });
                    setIsModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={20} />
                  Add Product
                </button>
              </div>
            </header>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-neutral-900">Product List</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name, SKU or category..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold w-10">
                        <button 
                          onClick={toggleSelectAll}
                          className="text-neutral-400 hover:text-emerald-600 transition-colors"
                        >
                          {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                            <CheckSquare size={20} className="text-emerald-600" />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 font-semibold">Product Details</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold text-right">Price (RM)</th>
                      <th className="px-6 py-4 font-semibold text-center">Stock</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredProducts.map((product) => (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-neutral-50 transition-colors group ${selectedIds.includes(product.id) ? 'bg-emerald-50/30' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleSelect(product.id)}
                            className="text-neutral-400 hover:text-emerald-600 transition-colors"
                          >
                            {selectedIds.includes(product.id) ? (
                              <CheckSquare size={20} className="text-emerald-600" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                              />
                            )}
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-900">{product.name}</span>
                              <span className="text-xs text-neutral-500 font-mono">{product.sku}</span>
                              {product.has_variations && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 w-fit mt-1">
                                  {product.variations?.length} Variations
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-neutral-900">
                          {product.has_variations && product.variations && product.variations.length > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-neutral-400 uppercase">From</span>
                              <span>{Math.min(...product.variations.map(v => v.price)).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            product.price.toLocaleString('en-MY', { minimumFractionDigits: 2 })
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-bold ${product.quantity <= product.min_stock ? 'text-red-600' : 'text-neutral-900'}`}>
                              {product.quantity}
                            </span>
                            <span className="text-[10px] text-neutral-400 uppercase font-medium">{product.unit_of_measure}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.quantity <= product.min_stock ? (
                            <span className="flex items-center gap-1 text-red-600 text-xs font-bold uppercase">
                              <AlertTriangle size={14} />
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-xs font-bold uppercase">In Stock</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openAdjust(product)}
                              title="Adjust Stock"
                              className="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <ArrowUpDown size={18} />
                            </button>
                            <button 
                              onClick={() => fetchHistory(product)}
                              title="View History"
                              className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <History size={18} />
                            </button>
                            <button 
                              onClick={() => openEdit(product)}
                              title="Edit Product"
                              className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              title="Delete Product"
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                          No products found. Start by adding one!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Order Management</h1>
                <p className="text-neutral-500">Track and manage customer orders</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setOrderFormData({ customer_name: '', delivery_date: '', items: [] });
                    setIsOrderModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
                >
                  <ShoppingCart size={20} />
                  Place Order
                </button>
              </div>
            </header>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-neutral-900">Order List</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by customer, ID, status or product..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">Order ID</th>
                      <th className="px-6 py-4 font-semibold">Customer</th>
                      <th className="px-6 py-4 font-semibold">Order Date</th>
                      <th className="px-6 py-4 font-semibold">Delivery Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Total (RM)</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors group">
                        <td className="px-6 py-4 font-mono text-sm text-neutral-500">
                          #{order.id.toString().padStart(5, '0')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-neutral-900">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-neutral-900">
                          {order.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'Processing' ? 'bg-amber-100 text-amber-700' :
                            'bg-neutral-100 text-neutral-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => fetchOrderDetails(order.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1 justify-end ml-auto"
                          >
                            Details
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Product Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">SKU</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                    <select 
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="" disabled>Select Category</option>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="has_variations"
                      checked={formData.has_variations}
                      onChange={e => setFormData({...formData, has_variations: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="has_variations" className="text-sm font-medium text-neutral-700">This product has variations</label>
                  </div>

                  {!formData.has_variations ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Price (RM)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            required
                            className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: e.target.value})}
                          />
                          <select 
                            className="w-24 px-2 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            value={formData.unit_of_measure}
                            onChange={e => setFormData({...formData, unit_of_measure: e.target.value})}
                          >
                            {UNIT_OPTIONS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Min Stock Alert Level</label>
                        <input 
                          type="number" 
                          required
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={formData.min_stock}
                          onChange={e => setFormData({...formData, min_stock: e.target.value})}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 space-y-4">
                      {formData.variations.map((variation, index) => (
                        <div key={index} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const newVariations = [...formData.variations];
                              newVariations.splice(index, 1);
                              setFormData({...formData, variations: newVariations});
                            }}
                            className="absolute top-2 right-2 text-neutral-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">Variation Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Small, Red"
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                value={variation.name}
                                onChange={e => {
                                  const newVariations = [...formData.variations];
                                  newVariations[index].name = e.target.value;
                                  setFormData({...formData, variations: newVariations});
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">SKU</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                value={variation.sku}
                                onChange={e => {
                                  const newVariations = [...formData.variations];
                                  newVariations[index].sku = e.target.value;
                                  setFormData({...formData, variations: newVariations});
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">Price</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                value={variation.price}
                                onChange={e => {
                                  const newVariations = [...formData.variations];
                                  newVariations[index].price = e.target.value;
                                  setFormData({...formData, variations: newVariations});
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">Quantity</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                value={variation.quantity}
                                onChange={e => {
                                  const newVariations = [...formData.variations];
                                  newVariations[index].quantity = e.target.value;
                                  setFormData({...formData, variations: newVariations});
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-500 mb-1">Min Stock</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                value={variation.min_stock}
                                onChange={e => {
                                  const newVariations = [...formData.variations];
                                  newVariations[index].min_stock = e.target.value;
                                  setFormData({...formData, variations: newVariations});
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          variations: [...formData.variations, { name: '', sku: '', price: '', quantity: '', min_stock: '5' }]
                        })}
                        className="w-full py-2 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Add Variation
                      </button>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Image URL</label>
                    <input 
                      type="url" 
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.image_url}
                      onChange={e => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.image_url && (
                      <div className="mt-2">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Reason for Change (Optional)</label>
                    <input 
                      type="text" 
                      placeholder={editingProduct ? "e.g., Restock, Damaged goods..." : "e.g., Initial stock"}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.reason}
                      onChange={e => setFormData({...formData, reason: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Adjust Stock</h2>
                  <p className="text-sm text-neutral-500">{adjustProduct?.name}</p>
                </div>
                <button 
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAdjust} className="p-6 space-y-4">
                {adjustProduct?.has_variations && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Variation</label>
                    <select
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={adjustData.variation_id}
                      onChange={e => setAdjustData({...adjustData, variation_id: e.target.value})}
                    >
                      <option value="">Select Variation</option>
                      {adjustProduct.variations?.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} (Qty: {v.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Adjustment Amount</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      placeholder="e.g., 10 or -5"
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={adjustData.amount}
                      onChange={e => setAdjustData({...adjustData, amount: e.target.value})}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      Current: {
                        adjustProduct?.has_variations && adjustData.variation_id
                          ? adjustProduct.variations?.find(v => v.id === parseInt(adjustData.variation_id))?.quantity
                          : adjustProduct?.quantity
                      }
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Use positive numbers for restock, negative for damage/sale.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Reason</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    value={adjustData.reason}
                    onChange={e => setAdjustData({...adjustData, reason: e.target.value})}
                  >
                    <option value="Restock">Restock</option>
                    <option value="Sale">Sale</option>
                    <option value="Damage">Damage</option>
                    <option value="Return">Return</option>
                    <option value="Correction">Correction</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !adjustData.amount}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Adjusting...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Update Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Bulk Update</h2>
                  <p className="text-sm text-neutral-500">Updating {selectedIds.length} selected products</p>
                </div>
                <button 
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBulkUpdate} className="p-6 space-y-6">
                <div className="space-y-4">
                  {/* Category Update */}
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                      checked={bulkFormData.updateCategory}
                      onChange={e => setBulkFormData({...bulkFormData, updateCategory: e.target.checked})}
                    />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Update Category</label>
                      <select 
                        disabled={!bulkFormData.updateCategory}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                        value={bulkFormData.category}
                        onChange={e => setBulkFormData({...bulkFormData, category: e.target.value})}
                      >
                        <option value="" disabled>Select Category</option>
                        {PRODUCT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Min Stock Update */}
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                      checked={bulkFormData.updateMinStock}
                      onChange={e => setBulkFormData({...bulkFormData, updateMinStock: e.target.checked})}
                    />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Update Min Stock Level</label>
                      <input 
                        type="number" 
                        disabled={!bulkFormData.updateMinStock}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                        value={bulkFormData.min_stock}
                        onChange={e => setBulkFormData({...bulkFormData, min_stock: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Unit Update */}
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                      checked={bulkFormData.updateUnit}
                      onChange={e => setBulkFormData({...bulkFormData, updateUnit: e.target.checked})}
                    />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Update Unit of Measure</label>
                      <select 
                        disabled={!bulkFormData.updateUnit}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                        value={bulkFormData.unit_of_measure}
                        onChange={e => setBulkFormData({...bulkFormData, unit_of_measure: e.target.value})}
                      >
                        <option value="" disabled>Select Unit</option>
                        {UNIT_OPTIONS.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || (!bulkFormData.updateCategory && !bulkFormData.updateMinStock && !bulkFormData.updateUnit)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Apply Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Place Order Modal */}
      <AnimatePresence>
        {isOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h2 className="text-xl font-bold text-neutral-900">Place New Order</h2>
                <button 
                  onClick={() => setIsOrderModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handlePlaceOrder} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Customer Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={orderFormData.customer_name}
                        onChange={e => setOrderFormData({...orderFormData, customer_name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Expected Delivery Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        type="date" 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={orderFormData.delivery_date}
                        onChange={e => setOrderFormData({...orderFormData, delivery_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900">Order Items</h3>
                    <button 
                      type="button"
                      onClick={() => setOrderFormData({
                        ...orderFormData, 
                        items: [...orderFormData.items, { product_id: 0, quantity: 1 }]
                      })}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {orderFormData.items.map((item, index) => {
                      const selectedProduct = products.find(p => p.id === item.product_id);
                      const hasVariations = selectedProduct?.has_variations;

                      return (
                      <div key={index} className="flex gap-3 items-end bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex-wrap">
                        {selectedProduct?.image_url && (
                          <div className="w-10 h-10 flex-shrink-0 mb-1">
                            <img 
                              src={selectedProduct.image_url} 
                              alt="Product" 
                              className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Product</label>
                          <select 
                            required
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                            value={item.product_id}
                            onChange={e => {
                              const newItems = [...orderFormData.items];
                              newItems[index].product_id = parseInt(e.target.value);
                              newItems[index].variation_id = undefined;
                              setOrderFormData({...orderFormData, items: newItems});
                            }}
                          >
                            <option value="0">Select Product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id} disabled={!p.has_variations && p.quantity <= 0}>
                                {p.name} {p.has_variations ? '(Select Variation)' : `(${p.quantity} ${p.unit_of_measure}) - RM ${p.price.toFixed(2)}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {hasVariations && (
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-medium text-neutral-500 mb-1">Variation</label>
                            <select
                              required
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                              value={item.variation_id || ''}
                              onChange={e => {
                                const newItems = [...orderFormData.items];
                                newItems[index].variation_id = parseInt(e.target.value);
                                setOrderFormData({...orderFormData, items: newItems});
                              }}
                            >
                              <option value="">Select Variation</option>
                              {selectedProduct.variations?.map(v => (
                                <option key={v.id} value={v.id} disabled={v.quantity <= 0}>
                                  {v.name} ({v.quantity} available) - RM {v.price.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="w-24">
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Qty</label>
                          <input 
                            type="number" 
                            min="1"
                            required
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...orderFormData.items];
                              newItems[index].quantity = parseInt(e.target.value);
                              setOrderFormData({...orderFormData, items: newItems});
                            }}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newItems = orderFormData.items.filter((_, i) => i !== index);
                            setOrderFormData({...orderFormData, items: newItems});
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                    })}
                    {orderFormData.items.length === 0 && (
                      <p className="text-center text-neutral-400 text-sm py-4">No items added yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800">Estimated Total:</span>
                  <span className="text-xl font-bold text-emerald-600">
                    RM {orderFormData.items.reduce((acc, item) => {
                      const product = products.find(p => p.id === item.product_id);
                      let price = 0;
                      if (product) {
                        if (product.has_variations && item.variation_id) {
                          const variation = product.variations?.find(v => v.id === item.variation_id);
                          price = variation ? variation.price : 0;
                        } else {
                          price = product.price;
                        }
                      }
                      return acc + (price * item.quantity);
                    }, 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsOrderModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || orderFormData.items.length === 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h2 className="text-xl font-bold text-neutral-900">Edit Profile</h2>
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profileFormData.full_name}
                    onChange={e => setProfileFormData({...profileFormData, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profileFormData.email}
                    onChange={e => setProfileFormData({...profileFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profileFormData.phone}
                    onChange={e => setProfileFormData({...profileFormData, phone: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isOrderDetailsOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderDetailsOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Order Details</h2>
                  <p className="text-sm text-neutral-500">Order #{selectedOrder.id.toString().padStart(5, '0')}</p>
                </div>
                <button 
                  onClick={() => setIsOrderDetailsOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Customer</label>
                      <p className="text-neutral-900 font-semibold">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Order Date</label>
                      <p className="text-neutral-900">{new Date(selectedOrder.order_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Delivery Date</label>
                      <p className="text-neutral-900">{selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Status</label>
                      <select 
                        className={`w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm ${
                          selectedOrder.status === 'Delivered' ? 'text-emerald-600' :
                          selectedOrder.status === 'Cancelled' ? 'text-red-600' :
                          'text-amber-600'
                        }`}
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      {selectedOrder.status === 'Cancelled' && selectedOrder.cancellation_reason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                          <span className="font-bold">Reason:</span> {selectedOrder.cancellation_reason}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Amount</label>
                      <p className="text-2xl font-bold text-emerald-600">RM {selectedOrder.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                    <ClipboardList size={18} className="text-neutral-400" />
                    Items Ordered
                  </h3>
                  <div className="border border-neutral-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Price (RM)</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {selectedOrder.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {item.product_image && (
                                  <img 
                                    src={item.product_image} 
                                    alt={item.product_name} 
                                    className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium text-neutral-900">{item.product_name}</span>
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    {item.variation_sku || item.product_sku}
                                  </span>
                                  {item.variation_name && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit mt-0.5">
                                      {item.variation_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{item.price_at_order.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-bold">
                              {(item.quantity * item.price_at_order).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-neutral-50 border-t border-neutral-100">
                <button 
                  onClick={() => setIsOrderDetailsOpen(false)}
                  className="w-full bg-white border border-neutral-200 text-neutral-600 font-semibold py-3 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Cancellation Reason Modal */}
      <AnimatePresence>
        {isCancellationModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancellationModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h2 className="text-xl font-bold text-neutral-900">Cancel Order</h2>
                <button 
                  onClick={() => setIsCancellationModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-neutral-600">Please provide a reason for cancelling this order.</p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                  placeholder="Enter cancellation reason..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsCancellationModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={confirmCancellation}
                    disabled={!cancellationReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Stock History</h2>
                  <p className="text-sm text-neutral-500">{historyProduct?.name} ({historyProduct?.sku})</p>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {stockHistory.map((entry, i) => {
                      const variation = historyProduct?.variations?.find(v => v.id === entry.variation_id);
                      return (
                      <div key={entry.id} className="relative flex gap-4">
                        {i !== stockHistory.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-0 w-px bg-neutral-100" />
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          entry.change_amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {entry.change_amount > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-neutral-900">
                              {entry.change_amount > 0 ? '+' : ''}{entry.change_amount} Units
                            </span>
                            <span className="text-xs text-neutral-400">
                              {new Date(entry.created_at).toLocaleString('en-MY')}
                            </span>
                          </div>
                          {variation && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit mb-1">
                              Variation: {variation.name}
                            </div>
                          )}
                          <p className="text-sm text-neutral-600 mb-1">{entry.reason}</p>
                          <div className="text-xs text-neutral-400 flex items-center gap-1">
                            <span>New Balance:</span>
                            <span className="font-semibold text-neutral-700">{entry.new_quantity}</span>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    {stockHistory.length === 0 && (
                      <div className="text-center py-12 text-neutral-500">
                        No history records found for this product.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
