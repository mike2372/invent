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
  ClipboardList,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User, StockHistory, Order, OrderItem } from './types';
import { PRODUCT_CATEGORIES, UNIT_OPTIONS } from './constants';
import { translations, Language } from './translations';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'client_dashboard' | 'clients'>('dashboard');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('stockmaster_lang');
    return (saved as Language) || 'en';
  });
  const t = (key: string) => translations[lang][key] || translations['en'][key] || key;
  const [selectedPeriod, setSelectedPeriod] = useState<'30_days' | '3_months' | '6_months' | '1_year' | 'all_time'>('all_time');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', full_name: '', email: '', phone: '' });
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<User | null>(null);
  const [clientFormData, setClientFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'client'
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
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
    variations: [] as { id?: string | number, name: string, sku: string, price: string, quantity: string, min_stock: string }[]
  });
  const [orderFormData, setOrderFormData] = useState({
    customer_name: '',
    delivery_date: '',
    items: [] as { product_id: string | number, variation_id?: string | number, quantity: number }[]
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
  const [orderToCancel, setOrderToCancel] = useState<string | number | null>(null);
  const [clientToDelete, setClientToDelete] = useState<User | null>(null);
  const [deleteClientError, setDeleteClientError] = useState('');
  const [isConfirmClearOrders, setIsConfirmClearOrders] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    bank_name: '',
    bank_account: '',
    account_holder: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
      if (user.role === 'admin') {
        fetchClients();
      }
      if (user.role === 'client') {
        setActiveTab('client_dashboard');
      }
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);

    if (payment === 'success') {
      alert('Payment successful!');
      window.history.replaceState({}, document.title, "/");
    } else if (payment === 'failed') {
      alert('Payment failed or cancelled.');
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        console.error('Clients data is not an array:', data);
      }
    } catch (err) {
      console.error('Failed to fetch clients');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) setPaymentSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentSettings)
      });
      if (res.ok) {
        alert('Settings updated successfully');
      }
    } catch (err) {
      console.error('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.error('Products data is not an array:', data);
      }
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
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error('Orders data is not an array:', data);
      }
    } catch (err) {
      console.error('Failed to fetch orders');
    }
  };

  const fetchOrderDetails = async (id: string | number) => {
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

  const toggleSelect = (id: string | number) => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('stockmaster_user', JSON.stringify(data.user));
      } else {
        setError(data.message || 'Registration failed');
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
    setIsRegisterMode(false);
  };

  const handleGuestLogin = async (role: 'admin' | 'client') => {
    if (role === 'admin') {
      const pass = window.prompt(t('password'));
      if (pass !== 'admin123') {
        setError(t('incorrectPassword'));
        return;
      }
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('stockmaster_user', JSON.stringify(data.user));
      } else {
        setError(data.message || 'Guest login failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
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
        payload.variation_id = adjustData.variation_id;
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

  const handleUpdateOrderStatus = async (id: string | number, status: string) => {
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

  const formatDate = (date: any) => {
    if (!date) return t('n/a');
    const d = new Date(date);
    return isNaN(d.getTime()) ? t('n/a') : d.toLocaleDateString();
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

  const handleNotifyPayment = async (orderId: string | number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_notified: true })
      });
      if (res.ok) {
        fetchOrders();
        const shortOrderId = orderId.toString().slice(-5).toUpperCase();
        const message = `${t('whatsappNotifyMsg')} #${shortOrderId}`;
        const whatsappUrl = `https://wa.me/60183883070?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to notify payment');
    }
  };

  const handlePayWithFiuu = async (orderId: string | number, channel: string = 'all') => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/fiuu-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, channel })
      });
      const data = await res.json();
      if (data.params) {
        // Create a hidden form and submit it to Fiuu
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;
        Object.keys(data.params).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.params[key];
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        alert(data.error || 'Payment initialization failed');
      }
    } catch (err) {
      console.error('Fiuu Pay Request Error:', err);
      alert('Payment failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  const handleClearOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/all', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setIsConfirmClearOrders(false);
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to clear orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setLoading(true);
    setDeleteClientError('');
    try {
      const res = await fetch(`/api/users/${clientToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setClientToDelete(null);
        fetchClients();
      } else {
        setDeleteClientError(data.error || 'Failed to delete client');
      }
    } catch (err) {
      setDeleteClientError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
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
      variations: (Array.isArray(product.variations) ? product.variations : []).map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price?.toString() || '0',
        quantity: v.quantity?.toString() || '0',
        min_stock: v.min_stock?.toString() || '0'
      }))
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
    totalRevenue: (Array.isArray(orders) ? orders : []).reduce((acc, o) => acc + (o.total_amount || 0), 0)
  };

  const GuestRestrictionMessage = () => (
    <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
        <ShieldCheck size={32} />
      </div>
      <h3 className="text-xl font-bold text-neutral-900 mb-2">{t('registeredOnly')}</h3>
      <p className="text-neutral-500 max-w-sm mx-auto mb-8 tracking-tight">{t('signInToTrack')}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          {t('signIn')}
        </button>
        <button
          onClick={() => { handleLogout(); setIsRegisterMode(true); }}
          className="w-full sm:w-auto bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
        >
          <UserCheck size={18} />
          {t('register')}
        </button>
      </div>
    </div>
  );

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
            <h1 className="text-2xl font-bold text-neutral-900">{t('appName')}</h1>
            <p className="text-neutral-500 text-sm">{t('appDesc')}</p>
          </div>

          <div className="flex bg-neutral-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isRegisterMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {t('signIn')}
            </button>
            <button
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isRegisterMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {t('register')}
            </button>
          </div>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t('fullName')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-neutral-300"
                    placeholder="Full Name"
                    value={registerData.full_name}
                    onChange={e => setRegisterData({ ...registerData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-neutral-300"
                    placeholder="email@example.com"
                    value={registerData.email}
                    onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-neutral-300"
                    placeholder="012-3456789"
                    value={registerData.phone}
                    onChange={e => setRegisterData({ ...registerData, phone: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('username')}</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-neutral-300"
                placeholder="username"
                value={isRegisterMode ? registerData.username : loginData.username}
                onChange={e => isRegisterMode
                  ? setRegisterData({ ...registerData, username: e.target.value })
                  : setLoginData({ ...loginData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-neutral-300"
                  placeholder="••••••••"
                  value={isRegisterMode ? registerData.password : loginData.password}
                  onChange={e => isRegisterMode
                    ? setRegisterData({ ...registerData, password: e.target.value })
                    : setLoginData({ ...loginData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? (isRegisterMode ? t('registering') : t('signingIn')) : (isRegisterMode ? t('register') : t('signIn'))}
            </button>
          </form>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setLang('en'); localStorage.setItem('stockmaster_lang', 'en'); }} className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${lang === 'en' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600'}`}>EN</button>
              <button onClick={() => { setLang('zh'); localStorage.setItem('stockmaster_lang', 'zh'); }} className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${lang === 'zh' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600'}`}>中文</button>
              <button onClick={() => { setLang('ms'); localStorage.setItem('stockmaster_lang', 'ms'); }} className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${lang === 'ms' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600'}`}>BM</button>
            </div>

            <div className="relative my-6 w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">{t('orSignInAs')}</span>
              </div>
            </div>

            <div className="w-full">
              <button
                type="button"
                onClick={() => handleGuestLogin('client')}
                disabled={loading}
                className="w-full flex flex-col items-center gap-2 p-6 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserCheck size={24} />
                </div>
                <span className="text-sm font-bold text-neutral-700">{t('guestClient')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-neutral-200 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Box className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-neutral-900">{t('stockmaster')}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors"
        >
          <div className="w-6 h-0.5 bg-neutral-600 mb-1.5 rounded-full"></div>
          <div className="w-6 h-0.5 bg-neutral-600 mb-1.5 rounded-full"></div>
          <div className="w-6 h-0.5 bg-neutral-600 rounded-full"></div>
        </button>
      </header>
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm shadow-2xl"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-white h-full flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <Box className="text-white w-5 h-5" />
                  </div>
                  <span className="font-bold text-lg text-neutral-900">{t('stockmaster')}</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-neutral-400 hover:bg-neutral-50 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {user.role === 'admin' ? (
                  <>
                    <button
                      onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <LayoutDashboard size={20} />
                      {t('dashboard')}
                    </button>
                    <button
                      onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <Package size={20} />
                      <span className="flex-1 text-left">{t('inventory')}</span>
                      {stats.lowStock > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          {stats.lowStock}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <ShoppingCart size={20} />
                      {t('orders')}
                    </button>
                    <button
                      onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'clients' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <UserIcon size={20} />
                      {t('clients')}
                    </button>
                    <button
                      onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <Settings2 size={20} />
                      {t('settings')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setActiveTab('client_dashboard'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'client_dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <LayoutDashboard size={20} />
                      {t('myDashboard')}
                    </button>
                    <button
                      onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
                    >
                      <ShoppingCart size={20} />
                      {t('myOrders')}
                    </button>
                  </>
                )}
              </nav>

              <div className="p-4 border-t border-neutral-100 space-y-2">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <button onClick={() => { setLang('en'); localStorage.setItem('stockmaster_lang', 'en'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'en' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>EN</button>
                  <button onClick={() => { setLang('zh'); localStorage.setItem('stockmaster_lang', 'zh'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'zh' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>中文</button>
                  <button onClick={() => { setLang('ms'); localStorage.setItem('stockmaster_lang', 'ms'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'ms' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>BM</button>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                >
                  <LogOut size={20} />
                  {t('logout')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="p-6 border-bottom border-neutral-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Box className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-neutral-900">{t('stockmaster')}</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {user.role === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutDashboard size={20} />
                {t('dashboard')}
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <Package size={20} />
                <span className="flex-1 text-left">{t('inventory')}</span>
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
                {t('orders')}
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'clients' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <UserIcon size={20} />
                {t('clients')}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <Settings2 size={20} />
                {t('settings')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('client_dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'client_dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutDashboard size={20} />
                {t('myDashboard')}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <ShoppingCart size={20} />
                {t('myOrders')}
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-neutral-100 space-y-2">
          <div className="flex items-center justify-center gap-1 mb-2">
            <button onClick={() => { setLang('en'); localStorage.setItem('stockmaster_lang', 'en'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'en' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>EN</button>
            <button onClick={() => { setLang('zh'); localStorage.setItem('stockmaster_lang', 'zh'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'zh' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>中文</button>
            <button onClick={() => { setLang('ms'); localStorage.setItem('stockmaster_lang', 'ms'); }} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${lang === 'ms' ? 'bg-emerald-100 text-emerald-700' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}>BM</button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
          >
            <LogOut size={20} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {activeTab === 'client_dashboard' && user.role === 'client' && (
          <div className="space-y-8">
            <header>
              <h1 className="text-2xl font-bold text-neutral-900">{t('myDashboard')}</h1>
              <p className="text-neutral-500">{t('welcomeBack')}, {user.full_name || user.username}</p>
            </header>

            {user.is_guest ? (
              <GuestRestrictionMessage />
            ) : (
              <>
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
                          <p className="text-sm text-neutral-500">{t('clientAccount')}</p>
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
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('email')}</label>
                        <p className="text-neutral-900">{user.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('phone')}</label>
                        <p className="text-neutral-900">{user.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('username')}</label>
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
                      <p className="text-neutral-500 text-sm font-medium">{t('totalOrders')}</p>
                      <h3 className="text-2xl font-bold text-neutral-900 mt-1">{orders.length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                        <DollarSign size={24} />
                      </div>
                      <p className="text-neutral-500 text-sm font-medium">{t('totalSpent')}</p>
                      <h3 className="text-2xl font-bold text-neutral-900 mt-1">
                        RM {orders.reduce((acc, o) => acc + o.total_amount, 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Top Purchased Products Chart */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-lg font-bold text-neutral-900">{t('topPurchasedProducts')}</h2>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as any)}
                      className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <option value="30_days">{t('period30Days')}</option>
                      <option value="3_months">{t('period3Months')}</option>
                      <option value="6_months">{t('period6Months')}</option>
                      <option value="1_year">{t('period1Year')}</option>
                      <option value="all_time">{t('periodAllTime')}</option>
                    </select>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const now = new Date();
                      const filteredOrders = orders.filter(order => {
                        if (selectedPeriod === 'all_time') return true;
                        const orderDateStr = order.order_date;
                        if (!orderDateStr) return false;
                        const orderDate = new Date(orderDateStr);
                        if (isNaN(orderDate.getTime())) return false;
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

                      const allItems = (Array.isArray(filteredOrders) ? filteredOrders : []).flatMap(o => Array.isArray(o.items) ? o.items : []);
                      const productStatsMap = new Map<string | number, { pid: string | number, name: string, sku: string, image?: string, totalQty: number }>();

                      allItems.forEach(item => {
                        const pid = item.product_id;
                        const existing = productStatsMap.get(pid);
                        if (existing) {
                          existing.totalQty += item.quantity;
                        } else {
                          productStatsMap.set(pid, {
                            pid: pid,
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
                            <p>{t('noProductsFound')}</p>
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
                                <Bar dataKey="totalQty" name={t('quantityPurchased')} radius={[4, 4, 0, 0]}>
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
                    <h2 className="text-lg font-bold text-neutral-900">{t('recentActivity')}</h2>
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
                                <p className="font-bold text-neutral-900">{t('orderId')} #{order.id?.toString().slice(-5).toUpperCase() || '00000'}</p>
                                <p className="text-xs text-neutral-500">{formatDate(order.order_date)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {order.status === 'Pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('manual_payment'); }}
                                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-200 transition-colors shadow-sm whitespace-nowrap"
                                  >
                                    {t('bankTransfer')}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePayWithFiuu(order.id, 'tng'); }}
                                    className="px-3 py-1.5 bg-[#0055A4] text-white text-[10px] font-bold rounded-lg hover:bg-[#004488] transition-colors shadow-sm whitespace-nowrap"
                                  >
                                    TNG eWallet
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePayWithFiuu(order.id, 'all'); }}
                                    className="px-3 py-1.5 bg-neutral-200 text-neutral-600 text-[10px] font-bold rounded-lg hover:bg-neutral-300 transition-colors shadow-sm whitespace-nowrap"
                                  >
                                    {t('others')}
                                  </button>
                                </div>
                              )}
                              {order.status === 'Pending' && !order.payment_notified && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleNotifyPayment(order.id); }}
                                  className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-200 transition-colors shadow-sm whitespace-nowrap flex items-center gap-1"
                                >
                                  <ShieldCheck size={12} />
                                  {t('notifyViaWhatsapp')}
                                </button>
                              )}
                              <div className="text-right">
                                <p className="font-bold text-neutral-900">RM {order.total_amount.toFixed(2)}</p>
                                <span className={`text-[10px] font-bold uppercase ${order.status === 'Delivered' ? 'text-emerald-600' : 'text-amber-600'
                                  }`}>{order.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-neutral-500 py-8">{t('noOrdersYet')}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )
        }

        {
          activeTab === 'dashboard' && user.role === 'admin' && (
            <>
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{t('dashboard')}</h1>
                  <p className="text-neutral-500">{t('welcomeBack')}, {user.username}</p>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: t('totalProducts'), value: stats.totalItems, icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: t('inventory'), value: stats.totalStock, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: t('stockValue'), value: `RM ${stats.totalValue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: t('lowStockItems'), value: stats.lowStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: t('totalOrders'), value: stats.totalOrders, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: t('pendingOrders'), value: stats.pendingOrders, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: t('totalRevenue'), value: `RM ${stats.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

              {/* Payment Notifications Alert */}
              {orders.filter(o => o.status === 'Pending' && o.payment_notified).length > 0 && (
                <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-amber-900">{t('pendingPaymentAlert')}</h2>
                      <p className="text-sm text-amber-600">{t('paymentNotification')} ({orders.filter(o => o.status === 'Pending' && o.payment_notified).length})</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.filter(o => o.status === 'Pending' && o.payment_notified).map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between group hover:border-amber-400 transition-all cursor-pointer"
                        onClick={() => fetchOrderDetails(order.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">#{order.id.toString().slice(-5).toUpperCase()}</p>
                            <p className="font-bold text-neutral-900 truncate">{order.customer_name}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">NEW</span>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <p className="font-bold text-emerald-600">RM {order.total_amount.toFixed(2)}</p>
                          <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                            {t('details')}
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock Alerts */}
              {stats.lowStock > 0 && (
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mb-8">
                  <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900">{t('lowStockAlerts')}</h2>
                      <p className="text-sm text-neutral-500">{t('restockNeeded')}</p>
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
                              <span>{t('minRequired')}: {product.min_stock}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{t('currentStock')}</p>
                            <p className="font-bold text-red-600 text-lg">{product.quantity} <span className="text-sm text-neutral-400 font-normal">{product.unit_of_measure}</span></p>
                          </div>
                          <button
                            onClick={() => openAdjust(product)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-100 flex items-center gap-2"
                          >
                            <ArrowUpDown size={16} />
                            {t('restock')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        }

        {
          activeTab === 'inventory' && (
            <>
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{t('inventoryManagement')}</h1>
                  <p className="text-neutral-500">{t('manageProducts')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedIds.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{}}
                      onClick={() => setIsBulkModalOpen(true)}
                      className="bg-amber-100 text-amber-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-amber-200 transition-all shadow-sm border border-amber-200"
                    >
                      <Settings2 size={20} />
                      {t('bulkUpdate')} ({selectedIds.length})
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
                    {t('import')} CSV
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-neutral-50 transition-all shadow-sm"
                  >
                    <Download size={20} />
                    {t('export')} CSV
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
                    {t('addProduct')}
                  </button>
                </div>
              </header>

              {/* Inventory Table */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-neutral-900">{t('productList')}</h2>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input
                      type="text"
                      placeholder={t('searchProducts')}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex flex-col gap-4">
                      <div className="flex gap-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-xl border border-neutral-200" />
                        ) : (
                          <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-neutral-200 text-neutral-400">
                            <Package size={32} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 rounded-md text-[10px] font-bold uppercase">{product.category}</span>
                            <button onClick={() => toggleSelect(product.id)} className="text-neutral-400 hover:text-emerald-600">
                              {selectedIds.includes(product.id) ? <CheckSquare size={20} className="text-emerald-600" /> : <Square size={20} />}
                            </button>
                          </div>
                          <h3 className="font-bold text-neutral-900 truncate">{product.name}</h3>
                          <p className="text-xs text-neutral-500 font-mono mb-2">{product.sku}</p>
                          <div className="flex items-center justify-between">
                            {product.has_variations && Array.isArray(product.variations) && product.variations.length > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-400 uppercase">From</span>
                                <span className="font-bold text-emerald-600">RM {Math.min(...product.variations.map(v => v.price)).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="font-bold text-emerald-600">RM {product.price.toFixed(2)}</span>
                            )}
                            <div className="flex flex-col items-end">
                              <span className={`font-bold ${product.quantity <= product.min_stock ? 'text-red-600' : 'text-neutral-700'}`}>{product.quantity}</span>
                              <span className="text-[10px] text-neutral-400 uppercase font-medium">{product.unit_of_measure}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-200">
                        <button onClick={() => openAdjust(product)} className="flex items-center justify-center p-2 bg-white rounded-xl border border-neutral-200 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <ArrowUpDown size={20} />
                        </button>
                        <button onClick={() => fetchHistory(product)} className="flex items-center justify-center p-2 bg-white rounded-xl border border-neutral-200 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <History size={20} />
                        </button>
                        <button onClick={() => openEdit(product)} className="flex items-center justify-center p-2 bg-white rounded-xl border border-neutral-200 text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <Edit2 size={20} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="flex items-center justify-center p-2 bg-white rounded-xl border border-neutral-200 text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                      {t('noProductsFound')}
                    </div>
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
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
                        <th className="px-6 py-4 font-semibold">{t('productDetails')}</th>
                        <th className="px-6 py-4 font-semibold">{t('category')}</th>
                        <th className="px-6 py-4 font-semibold text-right">{t('priceRM')}</th>
                        <th className="px-6 py-4 font-semibold text-center">{t('stockQty')}</th>
                        <th className="px-6 py-4 font-semibold">{t('status')}</th>
                        <th className="px-6 py-4 font-semibold text-right">{t('actions')}</th>
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
                            {product.has_variations && Array.isArray(product.variations) && product.variations.length > 0 ? (
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
                            {t('noProductsFound')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        }

        {
          activeTab === 'orders' && (
            <>
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{t('orderManagement')}</h1>
                  <p className="text-neutral-500">{t('manageOrders')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setIsConfirmClearOrders(true)}
                      className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                    >
                      <Trash2 size={18} />
                      Clear History
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOrderFormData({ customer_name: '', delivery_date: '', items: [] });
                      setIsOrderModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <ShoppingCart size={20} />
                    {t('placeOrder')}
                  </button>
                </div>
              </header>

              {user.role === 'client' && user.is_guest ? (
                <GuestRestrictionMessage />
              ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-neutral-900">{t('orders')}</h2>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input
                        type="text"
                        placeholder={t('searchOrders')}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                          <th className="px-6 py-4 font-semibold">{t('orderId')}</th>
                          <th className="px-6 py-4 font-semibold">{t('customer')}</th>
                          <th className="px-6 py-4 font-semibold">{t('orderDate')}</th>
                          <th className="px-6 py-4 font-semibold">{t('deliveryDate')}</th>
                          <th className="px-6 py-4 font-semibold text-right">{t('total')} (RM)</th>
                          <th className="px-6 py-4 font-semibold">{t('status')}</th>
                          <th className="px-6 py-4 font-semibold text-right">{t('actions')}</th>
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
                              {formatDate(order.order_date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-500">
                              {formatDate(order.delivery_date)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-neutral-900">
                              {order.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    order.status === 'Processing' ? 'bg-amber-100 text-amber-700' :
                                      'bg-neutral-100 text-neutral-600'
                                }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => fetchOrderDetails(order.id)}
                                  className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1"
                                >
                                  {t('details')}
                                  <ChevronRight size={16} />
                                </button>
                                {user.role === 'client' && order.status === 'Pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setActiveTab('manual_payment')}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors border border-emerald-200 shadow-sm"
                                    >
                                      Bank
                                    </button>
                                    <button
                                      onClick={() => handlePayWithFiuu(order.id, 'tng')}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0055A4] text-white hover:bg-[#004488] transition-colors border border-blue-700 shadow-sm"
                                    >
                                      TNG
                                    </button>
                                    <button
                                      onClick={() => handlePayWithFiuu(order.id, 'all')}
                                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors border border-neutral-200 shadow-sm"
                                    >
                                      {t('others')}
                                    </button>
                                  </div>
                                )}
                                {user.role === 'client' && ['Pending', 'Processing'].includes(order.status) && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                                  >
                                    {t('cancelOrder')}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                              {t('noOrdersFound')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        }

        {
          activeTab === 'clients' && user.role === 'admin' && (
            <div className="space-y-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{t('clientManagement')}</h1>
                  <p className="text-neutral-500">{t('manageClients')}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingClient(null);
                    setClientFormData({ username: '', password: '', full_name: '', email: '', phone: '', role: 'client' });
                    setIsClientModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={20} />
                  {t('addClient')}
                </button>
              </header>

              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-neutral-900">{t('clientList')}</h2>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input
                      type="text"
                      placeholder={t('searchClients')}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">{t('clientDetails')}</th>
                        <th className="px-6 py-4 font-semibold">{t('contactInfo')}</th>
                        <th className="px-6 py-4 font-semibold text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {clients.filter(c =>
                        c.username.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (c.full_name && c.full_name.toLowerCase().includes(clientSearch.toLowerCase())) ||
                        (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
                      ).map((client) => (
                        <tr key={client.id} className="hover:bg-neutral-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-900">{client.full_name || t('noName')}</span>
                              <span className="text-xs text-neutral-500">@{client.username}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-sm">
                              <span className="text-neutral-700">{client.email || '-'}</span>
                              <span className="text-neutral-500">{client.phone || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingClient(client);
                                  setClientFormData({
                                    username: client.username,
                                    password: '',
                                    full_name: client.full_name || '',
                                    email: client.email || '',
                                    phone: client.phone || '',
                                    role: client.role
                                  });
                                  setIsClientModalOpen(true);
                                }}
                                className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteClientError('');
                                  setClientToDelete(client);
                                }}
                                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                            {t('noClients')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        }

        {
          activeTab === 'settings' && user.role === 'admin' && (
            <div className="max-w-2xl">
              <header className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900">{t('settings')}</h1>
                <p className="text-neutral-500">Configure application and payment settings</p>
              </header>

              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-neutral-100">
                  <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <DollarSign className="text-emerald-600" size={20} />
                    {t('bankTransfer')}
                  </h2>
                </div>
                <form onSubmit={handleUpdateSettings} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">{t('bankName')}</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Maybank, CIMB"
                        value={paymentSettings.bank_name}
                        onChange={e => setPaymentSettings({ ...paymentSettings, bank_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">{t('accountNumber')}</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. 1234567890"
                        value={paymentSettings.bank_account}
                        onChange={e => setPaymentSettings({ ...paymentSettings, bank_account: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">{t('accountHolder')}</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. StockMaster Trading"
                        value={paymentSettings.account_holder}
                        onChange={e => setPaymentSettings({ ...paymentSettings, account_holder: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {isSavingSettings ? t('saving') : t('saveChanges')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

        {/* Manual Payment Info Modal for Clients */}
        {
          activeTab === 'manual_payment' && user.role === 'client' && (
            <div className="max-w-2xl bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">{t('bankTransfer')}</h1>
                  <p className="text-neutral-500">{t('manualTransferDesc')}</p>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">{t('bankName')}</label>
                  <p className="text-lg font-bold text-neutral-900">{paymentSettings.bank_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">{t('accountNumber')}</label>
                  <p className="text-2xl font-mono font-bold text-emerald-600 tracking-wider">
                    {paymentSettings.bank_account || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">{t('accountHolder')}</label>
                  <p className="text-lg font-bold text-neutral-900">{paymentSettings.account_holder || '-'}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-100">
                <button
                  onClick={() => setActiveTab('client_dashboard')}
                  className="w-full bg-neutral-900 text-white font-bold py-4 rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  {t('back')}
                </button>
              </div>
            </div>
          )
        }

      </main >

      {/* Product Modal */}
      <AnimatePresence>
        {
          isModalOpen && (
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
                    {editingProduct ? t('editProduct') : t('addNewProduct')}
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
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('productName')}</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('sku')}</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('category')}</label>
                      <select
                        required
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="" disabled>{t('selectCategory')}</option>
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
                        onChange={e => setFormData({ ...formData, has_variations: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                      />
                      <label htmlFor="has_variations" className="text-sm font-medium text-neutral-700">{t('hasVariations')}</label>
                    </div>

                    {!formData.has_variations ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('priceRM')}</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('quantity')}</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              required
                              className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={formData.quantity}
                              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            />
                            <select
                              className="w-24 px-2 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                              value={formData.unit_of_measure}
                              onChange={e => setFormData({ ...formData, unit_of_measure: e.target.value })}
                            >
                              {UNIT_OPTIONS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-neutral-700 mb-1">{t('minStockAlert')}</label>
                          <input
                            type="number"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.min_stock}
                            onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 space-y-4">
                        {(Array.isArray(formData.variations) ? formData.variations : []).map((variation, index) => (
                          <div key={index} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newVariations = [...formData.variations];
                                newVariations.splice(index, 1);
                                setFormData({ ...formData, variations: newVariations });
                              }}
                              className="absolute top-2 right-2 text-neutral-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('variationName')}</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Small, Red"
                                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                  value={variation.name}
                                  onChange={e => {
                                    const newVariations = [...formData.variations];
                                    newVariations[index].name = e.target.value;
                                    setFormData({ ...formData, variations: newVariations });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('variationSKU')}</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                  value={variation.sku}
                                  onChange={e => {
                                    const newVariations = [...formData.variations];
                                    newVariations[index].sku = e.target.value;
                                    setFormData({ ...formData, variations: newVariations });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('variationPrice')}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                  value={variation.price}
                                  onChange={e => {
                                    const newVariations = [...formData.variations];
                                    newVariations[index].price = e.target.value;
                                    setFormData({ ...formData, variations: newVariations });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('variationQty')}</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                  value={variation.quantity}
                                  onChange={e => {
                                    const newVariations = [...formData.variations];
                                    newVariations[index].quantity = e.target.value;
                                    setFormData({ ...formData, variations: newVariations });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('variationMinStock')}</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                                  value={variation.min_stock}
                                  onChange={e => {
                                    const newVariations = [...formData.variations];
                                    newVariations[index].min_stock = e.target.value;
                                    setFormData({ ...formData, variations: newVariations });
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
                          {t('addVariation')}
                        </button>
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('imageUrl')}</label>
                      <input
                        type="url"
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.image_url}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
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
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('reasonForChange')}</label>
                      <input
                        type="text"
                        placeholder={editingProduct ? "e.g., Restock, Damaged goods..." : "e.g., Initial stock"}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading ? t('saving') : (editingProduct ? t('updateProduct') : t('addProduct'))}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {
          isAdjustModalOpen && (
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
                    <h2 className="text-xl font-bold text-neutral-900">{t('adjustStock')}</h2>
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
                        onChange={e => setAdjustData({ ...adjustData, variation_id: e.target.value })}
                      >
                        <option value="">{t('selectVariation')}</option>
                        {adjustProduct.variations?.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} (Qty: {v.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('adjustmentAmount')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        placeholder="e.g., 10 or -5"
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={adjustData.amount}
                        onChange={e => setAdjustData({ ...adjustData, amount: e.target.value })}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                        {t('current')}: {
                          adjustProduct?.has_variations && adjustData.variation_id
                            ? adjustProduct.variations?.find(v => v.id === adjustData.variation_id)?.quantity
                            : adjustProduct?.quantity
                        }
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{t('adjustHint')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('reason')}</label>
                    <select
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={adjustData.reason}
                      onChange={e => setAdjustData({ ...adjustData, reason: e.target.value })}
                    >
                      <option value="Restock">{t('reasonRestock')}</option>
                      <option value="Sale">{t('reasonSale')}</option>
                      <option value="Damage">{t('reasonDamage')}</option>
                      <option value="Return">{t('reasonReturn')}</option>
                      <option value="Correction">{t('reasonCorrection')}</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAdjustModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !adjustData.amount}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading ? t('adjusting') : t('confirmAdjustment')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Bulk Update Modal */}
      <AnimatePresence>
        {
          isBulkModalOpen && (
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
                    <h2 className="text-xl font-bold text-neutral-900">{t('bulkUpdateTitle')}</h2>
                    <p className="text-sm text-neutral-500">{t('updatingProducts')} {selectedIds.length} {t('selectedProducts')}</p>
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
                        onChange={e => setBulkFormData({ ...bulkFormData, updateCategory: e.target.checked })}
                      />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('updateCategory')}</label>
                        <select
                          disabled={!bulkFormData.updateCategory}
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                          value={bulkFormData.category}
                          onChange={e => setBulkFormData({ ...bulkFormData, category: e.target.value })}
                        >
                          <option value="" disabled>{t('selectCategory')}</option>
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
                        onChange={e => setBulkFormData({ ...bulkFormData, updateMinStock: e.target.checked })}
                      />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('updateMinStock')}</label>
                        <input
                          type="number"
                          disabled={!bulkFormData.updateMinStock}
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                          value={bulkFormData.min_stock}
                          onChange={e => setBulkFormData({ ...bulkFormData, min_stock: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Unit Update */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                        checked={bulkFormData.updateUnit}
                        onChange={e => setBulkFormData({ ...bulkFormData, updateUnit: e.target.checked })}
                      />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('updateUnit')}</label>
                        <select
                          disabled={!bulkFormData.updateUnit}
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                          value={bulkFormData.unit_of_measure}
                          onChange={e => setBulkFormData({ ...bulkFormData, unit_of_measure: e.target.value })}
                        >
                          <option value="" disabled>{t('selectUnit')}</option>
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
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || (!bulkFormData.updateCategory && !bulkFormData.updateMinStock && !bulkFormData.updateUnit)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading ? t('updating') : t('applyChanges')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Place Order Modal */}
      <AnimatePresence>
        {
          isOrderModalOpen && (
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
                  <h2 className="text-xl font-bold text-neutral-900">{t('placeNewOrder')}</h2>
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
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('customerName')}</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input
                          type="text"
                          required
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={orderFormData.customer_name}
                          onChange={e => setOrderFormData({ ...orderFormData, customer_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">{t('expectedDelivery')}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input
                          type="date"
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={orderFormData.delivery_date}
                          onChange={e => setOrderFormData({ ...orderFormData, delivery_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-neutral-900">{t('orderItems')}</h3>
                      <button
                        type="button"
                        onClick={() => setOrderFormData({
                          ...orderFormData,
                          items: [...orderFormData.items, { product_id: '', quantity: 1 }]
                        })}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold flex items-center gap-1"
                      >
                        <Plus size={16} />
                        {t('addItem')}
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
                              <label className="block text-xs font-medium text-neutral-500 mb-1">{t('product')}</label>
                              <select
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
                                value={item.product_id}
                                onChange={e => {
                                  const newItems = [...orderFormData.items];
                                  newItems[index].product_id = e.target.value;
                                  newItems[index].variation_id = undefined;
                                  setOrderFormData({ ...orderFormData, items: newItems });
                                }}
                              >
                                <option value="0">{t('selectProduct')}</option>
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
                                    newItems[index].variation_id = e.target.value;
                                    setOrderFormData({ ...orderFormData, items: newItems });
                                  }}
                                >
                                  <option value="">{t('selectVariation')}</option>
                                  {(selectedProduct && Array.isArray(selectedProduct.variations) ? selectedProduct.variations : []).map(v => (
                                    <option key={v.id} value={v.id} disabled={v.quantity <= 0}>
                                      {v.name} ({v.quantity} available) - RM {v.price.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="w-24">
                              <label className="block text-xs font-medium text-neutral-500 mb-1">{t('qty')}</label>
                              <input
                                type="number"
                                min="1"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...orderFormData.items];
                                  newItems[index].quantity = parseInt(e.target.value);
                                  setOrderFormData({ ...orderFormData, items: newItems });
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = orderFormData.items.filter((_, i) => i !== index);
                                setOrderFormData({ ...orderFormData, items: newItems });
                              }}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        );
                      })}
                      {orderFormData.items.length === 0 && (
                        <p className="text-center text-neutral-400 text-sm py-4">{t('noItemsAdded')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800">{t('estimatedTotal')}</span>
                    <span className="text-xl font-bold text-emerald-600">
                      RM {(() => {
                        const total = (Array.isArray(orderFormData.items) ? orderFormData.items : []).reduce((acc, item) => {
                          const product = products.find(p => p.id === item.product_id);
                          let price = 0;
                          if (product) {
                            if (product.has_variations && item.variation_id) {
                              const variation = (Array.isArray(product.variations) ? product.variations : []).find(v => v.id === item.variation_id);
                              price = variation ? variation.price : 0;
                            } else {
                              price = product.price || 0;
                            }
                          }
                          return acc + (price * item.quantity);
                        }, 0);
                        return total.toLocaleString('en-MY', { minimumFractionDigits: 2 });
                      })()}
                    </span>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || orderFormData.items.length === 0}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading ? t('processing') : t('placeOrder')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {
          isProfileModalOpen && (
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
                  <h2 className="text-xl font-bold text-neutral-900">{t('editProfile')}</h2>
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('fullName')}</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={profileFormData.full_name}
                      onChange={e => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('email')}</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={profileFormData.email}
                      onChange={e => setProfileFormData({ ...profileFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('phone')}</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={profileFormData.phone}
                      onChange={e => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading ? t('saving') : t('saveChanges')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Order Details Modal */}
      <AnimatePresence>
        {
          isOrderDetailsOpen && selectedOrder && (
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
                    <h2 className="text-xl font-bold text-neutral-900">{t('orderDetails')}</h2>
                    <p className="text-sm text-neutral-500">{t('orderId')} #{selectedOrder.id.toString().padStart(5, '0')}</p>
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
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('customer')}</label>
                        <p className="text-neutral-900 font-semibold">{selectedOrder.customer_name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('orderDate')}</label>
                        <p className="text-sm font-bold text-neutral-900">{formatDate(selectedOrder.order_date)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('deliveryDate')}</label>
                        <p className="text-sm font-bold text-neutral-900">{formatDate(selectedOrder.delivery_date)}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('status')}</label>
                        <select
                          className={`w-full px-3 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm ${selectedOrder.status === 'Delivered' ? 'text-emerald-600' :
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
                            <span className="font-bold">{t('reason')}:</span> {selectedOrder.cancellation_reason}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t('totalAmount')}</label>
                        <p className="text-2xl font-bold text-emerald-600">RM {selectedOrder.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                      <ClipboardList size={18} className="text-neutral-400" />
                      {t('itemsOrdered')}
                    </h3>
                    <div className="border border-neutral-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-4 py-3">{t('product')}</th>
                            <th className="px-4 py-3 text-center">{t('qty')}</th>
                            <th className="px-4 py-3 text-right">{t('priceRM')}</th>
                            <th className="px-4 py-3 text-right">{t('subtotal')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                          {(selectedOrder && Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item) => (
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

                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-3">
                  {user.role === 'client' && selectedOrder?.status === 'Pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button
                        onClick={() => { setActiveTab('manual_payment'); setIsOrderDetailsOpen(false); }}
                        className="flex-1 bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-200 transition-colors shadow-lg shadow-emerald-50"
                      >
                        {t('bankTransfer')}
                      </button>
                      <button
                        onClick={() => handlePayWithFiuu(selectedOrder.id, 'tng')}
                        className="flex-1 bg-[#0055A4] text-white font-bold py-3 rounded-xl hover:bg-[#004488] transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                      >
                        TNG
                      </button>
                      <button
                        onClick={() => handlePayWithFiuu(selectedOrder.id, 'all')}
                        className="flex-1 bg-neutral-200 text-neutral-600 font-bold py-3 rounded-xl hover:bg-neutral-300 transition-colors shadow-lg shadow-neutral-100"
                      >
                        {t('others')}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setIsOrderDetailsOpen(false)}
                    className="w-full bg-white border border-neutral-200 text-neutral-600 font-semibold py-3 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
      {/* Cancellation Reason Modal */}
      <AnimatePresence>
        {
          isCancellationModalOpen && (
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
                  <h2 className="text-xl font-bold text-neutral-900">{t('cancelOrder')}</h2>
                  <button
                    onClick={() => setIsCancellationModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-neutral-600">{t('cancelOrderPrompt')}</p>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                    placeholder={t('enterCancelReason')}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsCancellationModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {t('back')}
                    </button>
                    <button
                      onClick={confirmCancellation}
                      disabled={!cancellationReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                    >
                      {t('confirmCancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

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
                  <h2 className="text-xl font-bold text-neutral-900">{t('stockHistory')}</h2>
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
                    {(Array.isArray(stockHistory) ? stockHistory : []).map((entry, i) => {
                      const variation = (historyProduct && Array.isArray(historyProduct.variations) ? historyProduct.variations : []).find(v => v.id === entry.variation_id);
                      return (
                        <div key={entry.id} className="relative flex gap-4">
                          {i !== stockHistory.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-0 w-px bg-neutral-100" />
                          )}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${entry.change_amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {entry.change_amount > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-neutral-900">
                                {entry.change_amount > 0 ? '+' : ''}{entry.change_amount} {t('units')}
                              </span>
                              <span className="text-xs text-neutral-400">
                                {entry.created_at ? new Date(entry.created_at).toLocaleString('en-MY') : '-'}
                              </span>
                            </div>
                            {variation && (
                              <div className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit mb-1">
                                {t('variation')}: {variation.name}
                              </div>
                            )}
                            <p className="text-sm text-neutral-600 mb-1">{entry.reason}</p>
                            <div className="text-xs text-neutral-400 flex items-center gap-1">
                              <span>{t('newBalance')}:</span>
                              <span className="font-semibold text-neutral-700">{entry.new_quantity}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {stockHistory.length === 0 && (
                      <div className="text-center py-12 text-neutral-500">
                        {t('noHistory')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingClient ? t('editClient') : t('addNewClient')}
                </h2>
                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const method = editingClient ? 'PUT' : 'POST';
                const url = editingClient ? `/api/users/${editingClient.id}` : '/api/users';
                try {
                  const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientFormData)
                  });
                  if (res.ok) {
                    setIsClientModalOpen(false);
                    fetchClients();
                  }
                } catch (err) {
                  console.error('Failed to save client');
                } finally {
                  setLoading(false);
                }
              }} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('fullName')}</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={clientFormData.full_name}
                      onChange={e => setClientFormData({ ...clientFormData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('username')}</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingClient}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-neutral-50"
                      value={clientFormData.username}
                      onChange={e => setClientFormData({ ...clientFormData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('password')}</label>
                    <input
                      type="password"
                      required={!editingClient}
                      placeholder={editingClient ? t('leaveBlank') : ''}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={clientFormData.password}
                      onChange={e => setClientFormData({ ...clientFormData, password: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('email')}</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={clientFormData.email}
                      onChange={e => setClientFormData({ ...clientFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('phone')}</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={clientFormData.phone}
                      onChange={e => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? t('saving') : (editingClient ? t('updateClient') : t('addClient'))}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Client Confirmation Modal */}
      <AnimatePresence>
        {clientToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setClientToDelete(null); setDeleteClientError(''); }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('deleteConfirm')}</h2>
                  <p className="text-sm text-neutral-500">
                    This will permanently remove <span className="font-semibold text-neutral-700">{clientToDelete.full_name || clientToDelete.username}</span> and cannot be undone.
                  </p>
                </div>
                {deleteClientError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 w-full text-left">{deleteClientError}</p>
                )}
                <div className="flex gap-3 w-full pt-2">
                  <button
                    onClick={() => { setClientToDelete(null); setDeleteClientError(''); }}
                    className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDeleteClient}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Orders Confirmation Modal */}
      <AnimatePresence>
        {isConfirmClearOrders && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmClearOrders(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-1">Clear Order History</h2>
                  <p className="text-sm text-neutral-500">
                    This will permanently delete <span className="font-bold text-red-600">ALL</span> orders and order items. This action cannot be undone. Are you absolutely sure?
                  </p>
                </div>
                <div className="flex gap-3 w-full pt-2">
                  <button
                    onClick={() => setIsConfirmClearOrders(false)}
                    className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleClearOrders}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    {loading ? 'Clearing...' : 'Clear All Orders'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div >
  );
}
