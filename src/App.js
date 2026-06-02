import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { FaBoxes, FaFileInvoice, FaUsers, FaUndo, FaMoon, FaSun, FaSearch, FaPlus, FaDownload, FaPrint, FaTrash, FaEdit, FaUpload, FaShoppingCart, FaTag, FaSave, FaExchangeAlt, FaPalette } from 'react-icons/fa';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import io from 'socket.io-client';
import ProductVariantManager from './components/ProductVariantManager';

const BACKEND_URL = 'https://glowhaven-billing-be.onrender.com';
const API_URL = BACKEND_URL;
const socket = io(BACKEND_URL);

function App() {
  const [activeTab, setActiveTab] = useState('billing');
  const [darkMode, setDarkMode] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showVariantManager, setShowVariantManager] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [currentProductForVariant, setCurrentProductForVariant] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Manual bill entry state
  const [manualBillItems, setManualBillItems] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [manualProductSearch, setManualProductSearch] = useState('');
  const [manualProductQuantity, setManualProductQuantity] = useState(1);
  const [manualProductPrice, setManualProductPrice] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('Cash');
  
  // Edit bill state
  const [editBillItems, setEditBillItems] = useState([]);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('Cash');
  const [editProductSearch, setEditProductSearch] = useState('');
  const [editProductQuantity, setEditProductQuantity] = useState(1);
  const [editSelectedProduct, setEditSelectedProduct] = useState(null);
  
  // Return state
  const [returnBillId, setReturnBillId] = useState('');
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [selectedBillForReturn, setSelectedBillForReturn] = useState(null);
  
  // Data states
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [returns, setReturns] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Bill creation states
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [billSearchTerm, setBillSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchBills();
    fetchReturns();
    
    socket.on('new-bill', (bill) => {
      toast.success(`New bill created: ${bill.billId}`);
      fetchBills();
    });
    
    socket.on('product-updated', () => {
      fetchProducts();
    });
    
    socket.on('return-processed', (returnItem) => {
      toast.success(`Return processed: ${returnItem.returnId}`);
      fetchReturns();
      fetchBills();
      fetchProducts();
    });
    
    return () => {
      socket.off('new-bill');
      socket.off('product-updated');
      socket.off('return-processed');
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const fetchCustomers = async (page = 1) => {
    try {
      const res = await axios.get(`${API_URL}/customers?search=${globalSearchTerm}&page=${page}`);
      setCustomers(res.data.customers);
      setTotalPages(res.data.totalPages);
      setCurrentPage(page);
    } catch (error) {
      toast.error('Error fetching customers');
    }
  };

  const fetchProducts = async (page = 1) => {
    try {
      const res = await axios.get(`${API_URL}/products?search=${globalSearchTerm}&category=${categoryFilter}&page=${page}`);
      setProducts(res.data.products);
      setCategories(res.data.categories || []);
      setTotalPages(res.data.totalPages);
      setCurrentPage(page);
    } catch (error) {
      toast.error('Error fetching products');
    }
  };

  const fetchBills = async (page = 1) => {
    try {
      const res = await axios.get(`${API_URL}/bills?search=${billSearchTerm}&startDate=${dateRange.start}&endDate=${dateRange.end}&page=${page}`);
      setBills(res.data.bills);
      setTotalPages(res.data.totalPages);
      setCurrentPage(page);
    } catch (error) {
      toast.error('Error fetching bills');
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await axios.get(`${API_URL}/returns`);
      setReturns(res.data);
    } catch (error) {
      toast.error('Error fetching returns');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'customer') {
        if (editingItem) {
          await axios.put(`${API_URL}/customers/${editingItem._id}`, formData);
          toast.success('Customer updated');
        } else {
          await axios.post(`${API_URL}/customers`, formData);
          toast.success('Customer added');
        }
        fetchCustomers();
      } else if (modalType === 'product') {
        if (editingItem) {
          await axios.put(`${API_URL}/products/${editingItem._id}`, formData);
          toast.success('Product updated');
        } else {
          await axios.post(`${API_URL}/products`, formData);
          toast.success('Product added');
        }
        fetchProducts();
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving data');
    }
  };

  const handleDelete = async (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        if (type === 'customer') {
          await axios.delete(`${API_URL}/customers/${id}`);
          toast.success('Customer deleted successfully');
          fetchCustomers();
        } else if (type === 'product') {
          await axios.delete(`${API_URL}/products/${id}`);
          toast.success('Product deleted successfully');
          fetchProducts();
        } else if (type === 'bill') {
          await axios.delete(`${API_URL}/bills/${id}`);
          toast.success('Bill deleted successfully');
          fetchBills();
        } else if (type === 'return') {
          await axios.delete(`${API_URL}/returns/${id}`);
          toast.success('Return deleted successfully');
          fetchReturns();
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.message || 'Error deleting item');
      }
    }
  };

  // Return Functions
  const openReturnModal = () => {
    setShowReturnModal(true);
    setSelectedBillForReturn(null);
    setReturnItems([]);
    setReturnBillId('');
    setReturnReason('');
  };

  const searchBillForReturn = async () => {
    if (!returnBillId) {
      toast.error('Please enter a Bill ID');
      return;
    }
    
    try {
      const res = await axios.get(`${API_URL}/bills?search=${returnBillId}`);
      const bill = res.data.bills.find(b => b.billId.toLowerCase().includes(returnBillId.toLowerCase()));
      
      if (bill) {
        setSelectedBillForReturn(bill);
        setReturnItems(bill.items.map(item => ({
          ...item,
          returnQuantity: 0,
          selected: false
        })));
        toast.success(`Bill found: ${bill.billId}`);
      } else {
        toast.error('Bill not found');
        setSelectedBillForReturn(null);
      }
    } catch (error) {
      toast.error('Error searching bill');
    }
  };

  const toggleReturnItem = (index) => {
    const newItems = [...returnItems];
    if (newItems[index].selected) {
      newItems[index].selected = false;
      newItems[index].returnQuantity = 0;
    } else {
      newItems[index].selected = true;
      newItems[index].returnQuantity = newItems[index].quantity;
    }
    setReturnItems(newItems);
  };

  const updateReturnQuantity = (index, quantity) => {
    const newItems = [...returnItems];
    const maxQuantity = newItems[index].quantity;
    newItems[index].returnQuantity = Math.min(Math.max(1, quantity), maxQuantity);
    setReturnItems(newItems);
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((total, item) => {
      if (item.selected) {
        return total + (item.price * item.returnQuantity);
      }
      return total;
    }, 0);
  };

  const processReturn = async () => {
    const selectedItems = returnItems.filter(item => item.selected && item.returnQuantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }
    
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for return');
      return;
    }
    
    const totalRefund = calculateTotalRefund();
    
    const returnData = {
      returnId: `RET-${Date.now()}`,
      originalBillId: selectedBillForReturn.billId,
      customerId: selectedBillForReturn.customerId,
      customerName: selectedBillForReturn.customerName,
      items: selectedItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantSku: item.variantSku,
        variantName: item.variantName,
        quantity: item.returnQuantity,
        refundAmount: item.price * item.returnQuantity
      })),
      totalRefund: totalRefund,
      reason: returnReason,
      status: 'approved'
    };
    
    try {
      await axios.post(`${API_URL}/returns`, returnData);
      toast.success(`Return processed successfully! Refund amount: Rs.${totalRefund.toFixed(2)}`);
      setShowReturnModal(false);
      setSelectedBillForReturn(null);
      setReturnItems([]);
      setReturnBillId('');
      setReturnReason('');
      fetchReturns();
      fetchBills();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing return');
    }
  };

  // Edit Bill Functions
  const openEditBillModal = (bill) => {
    setEditingBill(bill);
    setEditBillItems(bill.items.map(item => ({ ...item })));
    setEditCustomerId(bill.customerId);
    setEditDiscount(bill.discount || 0);
    setEditPaymentMethod(bill.paymentMethod || 'Cash');
    setShowEditBillModal(true);
  };

  const addEditBillItem = () => {
    if (!editSelectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (editProductQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const existingItem = editBillItems.find(item => item.productId === editSelectedProduct.productId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + editProductQuantity;
      setEditBillItems(editBillItems.map(item =>
        item.productId === editSelectedProduct.productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ));
    } else {
      setEditBillItems([...editBillItems, {
        productId: editSelectedProduct.productId,
        productName: editSelectedProduct.name,
        quantity: editProductQuantity,
        price: editSelectedProduct.basePrice || editSelectedProduct.price,
        total: (editSelectedProduct.basePrice || editSelectedProduct.price) * editProductQuantity
      }]);
    }
    
    toast.success(`${editSelectedProduct.name} added to bill`);
    setEditSelectedProduct(null);
    setEditProductSearch('');
    setEditProductQuantity(1);
  };

  const removeEditBillItem = (index) => {
    const newItems = [...editBillItems];
    newItems.splice(index, 1);
    setEditBillItems(newItems);
  };

  const updateEditBillQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeEditBillItem(index);
      return;
    }
    const newItems = [...editBillItems];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].price;
    setEditBillItems(newItems);
  };

  const updateEditBillPrice = (index, price) => {
    if (price <= 0) return;
    const newItems = [...editBillItems];
    newItems[index].price = price;
    newItems[index].total = newItems[index].quantity * price;
    setEditBillItems(newItems);
  };

  const updateBill = async () => {
    if (editBillItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    const subtotal = editBillItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - editDiscount;

    const billData = {
      billId: editingBill.billId,
      customerId: editCustomerId,
      customerName: editingBill.customerName,
      customerEmail: editingBill.customerEmail,
      customerPhone: editingBill.customerPhone,
      items: editBillItems,
      subtotal,
      discount: editDiscount,
      total,
      loyaltyPointsEarned: Math.floor(total / 100),
      loyaltyPointsRedeemed: 0,
      paymentMethod: editPaymentMethod,
      date: editingBill.date
    };

    try {
      await axios.put(`${API_URL}/bills/${editingBill._id}`, billData);
      toast.success('Bill updated successfully!');
      setShowEditBillModal(false);
      setEditingBill(null);
      setEditBillItems([]);
      setEditCustomerId('');
      setEditDiscount(0);
      fetchBills();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating bill');
    }
  };

  // Add to cart with variant support
  const addToCartWithVariant = (product, variant) => {
    if (variant.stock < 1) {
      toast.error(`${variant.name} is out of stock`);
      return;
    }
    
    const existing = cart.find(item => item.productId === product.productId && item.variantSku === variant.sku);
    if (existing) {
      if (variant.stock < existing.quantity + 1) {
        toast.error('Insufficient stock for this shade');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.productId && item.variantSku === variant.sku
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * (variant.price || product.basePrice) }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.productId,
        productName: product.name,
        variantSku: variant.sku,
        variantName: variant.name,
        colorCode: variant.colorCode,
        quantity: 1,
        price: variant.price || product.basePrice,
        total: variant.price || product.basePrice
      }]);
    }
    toast.success(`${product.name} - ${variant.name} added to cart`);
    setShowVariantSelector(false);
    setCurrentProductForVariant(null);
  };

  // Add regular product to cart
  const addToCart = (product) => {
    if (product.defaultStock < 1) {
      toast.error('Product out of stock');
      return;
    }
    const existing = cart.find(item => item.productId === product.productId && !item.variantSku);
    if (existing) {
      if (product.defaultStock < existing.quantity + 1) {
        toast.error('Insufficient stock');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.productId && !item.variantSku
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.productId,
        productName: product.name,
        quantity: 1,
        price: product.basePrice,
        total: product.basePrice
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateCartQuantity = (index, quantity) => {
    const item = cart[index];
    if (quantity <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      const newCart = [...cart];
      newCart[index].quantity = quantity;
      newCart[index].total = quantity * newCart[index].price;
      setCart(newCart);
    }
  };

  const createBill = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    let discount = 0;
    let loyaltyPointsRedeemed = 0;
    
    if (selectedCustomer && loyaltyPointsToRedeem > 0) {
      const maxRedeem = Math.min(selectedCustomer.loyaltyPoints || 0, subtotal * 0.5);
      loyaltyPointsRedeemed = Math.min(loyaltyPointsToRedeem, maxRedeem);
      discount = loyaltyPointsRedeemed;
    }
    
    const total = subtotal - discount;
    const loyaltyPointsEarned = Math.floor(total / 100);

    const billData = {
      billId: `BILL-${Date.now()}`,
      customerId: selectedCustomer?.customerId,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerEmail: selectedCustomer?.email,
      customerPhone: selectedCustomer?.phone,
      items: cart,
      subtotal,
      discount,
      total,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed,
      paymentMethod: 'Cash'
    };

    try {
      await axios.post(`${API_URL}/bills`, billData);
      toast.success('Bill created successfully!');
      setCart([]);
      setSelectedCustomer(null);
      setLoyaltyPointsToRedeem(0);
      fetchBills();
      fetchCustomers();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating bill');
    }
  };

  // Add product to manual bill (from database)
  const addManualBillItemFromDB = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (manualProductQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const existingItem = manualBillItems.find(item => item.productId === selectedProduct.productId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + manualProductQuantity;
      setManualBillItems(manualBillItems.map(item =>
        item.productId === selectedProduct.productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ));
    } else {
      setManualBillItems([...manualBillItems, {
        productId: selectedProduct.productId,
        productName: selectedProduct.name,
        quantity: manualProductQuantity,
        price: selectedProduct.basePrice,
        total: selectedProduct.basePrice * manualProductQuantity,
        isCustom: false
      }]);
    }
    
    toast.success(`${selectedProduct.name} added to bill`);
    setSelectedProduct(null);
    setManualProductSearch('');
    setManualProductQuantity(1);
  };

  // Add custom product (not in database)
  const addCustomProduct = () => {
    if (!customProductName.trim()) {
      toast.error('Please enter product name');
      return;
    }
    if (manualProductQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (manualProductPrice <= 0) {
      toast.error('Please enter valid price');
      return;
    }

    setManualBillItems([...manualBillItems, {
      productId: `CUSTOM-${Date.now()}-${Math.random()}`,
      productName: customProductName,
      quantity: manualProductQuantity,
      price: manualProductPrice,
      total: manualProductPrice * manualProductQuantity,
      isCustom: true
    }]);
    
    toast.success(`${customProductName} added to bill`);
    setCustomProductName('');
    setManualProductPrice(0);
    setManualProductQuantity(1);
    setIsCustomProduct(false);
  };

  const removeManualBillItem = (index) => {
    const newItems = [...manualBillItems];
    newItems.splice(index, 1);
    setManualBillItems(newItems);
  };

  const updateManualBillQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeManualBillItem(index);
      return;
    }
    const newItems = [...manualBillItems];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].price;
    setManualBillItems(newItems);
  };

  const updateManualBillPrice = (index, price) => {
    if (price <= 0) return;
    const newItems = [...manualBillItems];
    newItems[index].price = price;
    newItems[index].total = newItems[index].quantity * price;
    setManualBillItems(newItems);
  };

  const createManualBill = async () => {
    if (manualBillItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    let customerName = 'Walk-in Customer';
    let customerId = null;
    let customerEmail = '';
    let customerPhone = '';
    
    if (selectedCustomerId) {
      const selectedCust = customers.find(c => c._id === selectedCustomerId);
      if (selectedCust) {
        customerName = selectedCust.name;
        customerId = selectedCust.customerId;
        customerEmail = selectedCust.email;
        customerPhone = selectedCust.phone;
      }
    }

    const subtotal = manualBillItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - manualDiscount;

    const billData = {
      billId: `BILL-${Date.now()}`,
      customerId: customerId || `WALK-${Date.now()}`,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      items: manualBillItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      subtotal,
      discount: manualDiscount,
      total,
      loyaltyPointsEarned: Math.floor(total / 100),
      loyaltyPointsRedeemed: 0,
      paymentMethod: manualPaymentMethod
    };

    try {
      await axios.post(`${API_URL}/bills`, billData);
      toast.success('Bill created successfully!');
      setShowBillModal(false);
      setManualBillItems([]);
      setSelectedCustomerId('');
      setManualDiscount(0);
      setManualPaymentMethod('Cash');
      setSelectedProduct(null);
      setCustomProductName('');
      setManualProductPrice(0);
      setIsCustomProduct(false);
      fetchBills();
      fetchCustomers();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating bill');
    }
  };

  const downloadPDF = async (billId) => {
    window.open(`${API_URL}/bills/${billId}/pdf`, '_blank');
  };

  const printBill = (bill) => {
    const subtotal = bill.items.reduce((sum, i) => sum + i.total, 0);
    const total = subtotal - (bill.discount || 0);
    
    const cuteMessages = [
      "Thank you for choosing GlowHaven!",
      "Glow brighter every day with GlowHaven!",
      "You're beautiful, and we love serving you!",
      "Keep shining like the star you are!",
      "Stay glamorous, stay gorgeous!",
      "Come back soon for more beauty treasures!",
      "Loved serving you! See you again!"
    ];
    const randomMessage = cuteMessages[Math.floor(Math.random() * cuteMessages.length)];
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GlowHaven Bill - ${bill.billId}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 40px 20px;
            background: #f9f9f9;
            display: flex;
            justify-content: center;
          }
          .bill-container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .bill-header {
            background: linear-gradient(135deg, #8B0000, #CC3333);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .shop-name {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .tagline {
            font-size: 12px;
            opacity: 0.9;
            margin-top: 5px;
          }
          .shop-details {
            font-size: 11px;
            margin-top: 10px;
            opacity: 0.8;
          }
          .bill-body {
            padding: 30px;
          }
          .bill-info {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          .bill-info-item {
            font-size: 12px;
          }
          .bill-info-item strong {
            color: #8B0000;
          }
          .customer-section {
            background: linear-gradient(135deg, #FFF5F5, #FFFFFF);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #8B0000;
          }
          .customer-title {
            font-size: 14px;
            font-weight: bold;
            color: #8B0000;
            margin-bottom: 10px;
          }
          .customer-details {
            font-size: 12px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #8B0000;
            color: white;
            padding: 10px;
            font-size: 12px;
            text-align: left;
          }
          td {
            padding: 10px;
            font-size: 12px;
            border-bottom: 1px solid #eee;
          }
          .total-section {
            text-align: right;
            padding: 15px;
            background: #f8f8f8;
            border-radius: 10px;
            margin-top: 10px;
          }
          .total-row {
            font-size: 16px;
            font-weight: bold;
            color: #8B0000;
            margin-top: 5px;
          }
          .cute-message {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #FFF0F0, #FFFFFF);
            border-radius: 10px;
            margin: 20px 0;
            font-size: 14px;
            color: #8B0000;
            font-style: italic;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 11px;
            color: #999;
            border-top: 1px solid #eee;
          }
          .thankyou {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            color: #8B0000;
            margin-top: 10px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .bill-container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="bill-container">
          <div class="bill-header">
            <div class="shop-name">GLOWHAVEN</div>
            <div class="tagline">Your Beauty Destination</div>
            <div class="shop-details">
              123 Beauty Boulevard, Cosmetics City<br />
              Phone: +91 98765 43210 <br />
              GST: 27ABCDE1234F1Z5
            </div>
          </div>
          
          <div class="bill-body">
            <div class="bill-info">
              <div class="bill-info-item"><strong>Bill No:</strong> ${bill.billId}</div>
              <div class="bill-info-item"><strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</div>
              <div class="bill-info-item"><strong>Time:</strong> ${new Date(bill.date).toLocaleTimeString()}</div>
            </div>
            
            <div class="customer-section">
              <div class="customer-title">Customer Details</div>
              <div class="customer-details">
                <strong>Name:</strong> ${bill.customerName}<br />
                ${bill.customerPhone ? `<strong>Phone:</strong> ${bill.customerPhone}<br />` : ''}
                ${bill.customerEmail ? `<strong>Email:</strong> ${bill.customerEmail}<br />` : ''}
              </div>
            </div>
            
            <table>
              <thead>
                <tr><th>#</th><th>Product</th><th>Shade</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${bill.items.map((item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.variantName || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>Rs.${item.price.toFixed(2)}</td>
                    <td>Rs.${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total-section">
              <div>Subtotal: Rs.${subtotal.toFixed(2)}</div>
              ${bill.discount && bill.discount > 0 ? `<div>Discount: -Rs.${bill.discount.toFixed(2)}</div>` : ''}
              <div class="total-row">Total: Rs.${total.toFixed(2)}</div>
              <div>Payment: ${bill.paymentMethod || 'Cash'}</div>
            </div>
            
            <div class="cute-message">
              ${randomMessage}
            </div>
            
            <div class="thankyou">
              Thank you for shopping at GlowHaven!
            </div>
          </div>
          
          <div class="footer">
            This is a computer generated invoice - valid without signature<br />
            Follow us on social media 
          </div>
        </div>
        <script>
          window.print();
          window.onafterprint = function() { window.close(); };
          setTimeout(function() { window.close(); }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleBulkImport = async (type, file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (type === 'customer') {
          await axios.post(`${API_URL}/customers/bulk`, { customers: data });
          toast.success('Customers imported successfully');
          fetchCustomers();
        } else if (type === 'product') {
          await axios.post(`${API_URL}/products/bulk`, { products: data });
          toast.success('Products imported successfully');
          fetchProducts();
        }
      } catch (error) {
        toast.error('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  // Variant Selector Modal
  const renderVariantSelector = () => (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-md">
        <div className="modal-content">
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #8B0000, #CC3333)', color: 'white' }}>
            <h5 className="modal-title">
              <FaPalette /> Select Color/Shade - {currentProductForVariant?.name}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={() => setShowVariantSelector(false)}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              {currentProductForVariant?.variants?.map((variant, index) => (
                <div key={index} className="col-12 mb-2">
                  <div 
                    className={`card ${variant.stock > 0 ? 'cursor-pointer' : 'opacity-50'}`} 
                    style={{ 
                      cursor: variant.stock > 0 ? 'pointer' : 'not-allowed',
                      border: variant.stock > 0 ? '2px solid transparent' : '2px solid #dc3545'
                    }}
                    onClick={() => variant.stock > 0 && addToCartWithVariant(currentProductForVariant, variant)}>
                    <div className="card-body py-3">
                      <div className="d-flex align-items-center">
                        <div style={{ 
                          width: '50px', 
                          height: '50px', 
                          backgroundColor: variant.colorCode || '#000',
                          borderRadius: '50%',
                          border: '3px solid #fff',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                          marginRight: '15px'
                        }}></div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">{variant.name}</h6>
                          <small className="text-muted">SKU: {variant.sku}</small>
                          <div className="mt-1">
                            <span className="fw-bold text-success">Rs.{variant.price || currentProductForVariant?.basePrice}</span>
                            <span className={`ms-2 ${variant.stock < 10 ? 'text-danger' : 'text-muted'}`}>
                              {variant.stock > 0 ? `Stock: ${variant.stock}` : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                        {variant.stock > 0 && (
                          <button className="btn btn-primary btn-sm">Add to Cart</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowVariantSelector(false)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Return Modal Component
  const renderReturnModal = () => (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <FaExchangeAlt className="me-2" /> Process Return / Refund
            </h5>
            <button type="button" className="btn-close" onClick={() => {
              setShowReturnModal(false);
              setSelectedBillForReturn(null);
              setReturnItems([]);
              setReturnBillId('');
            }}></button>
          </div>
          <div className="modal-body">
            {!selectedBillForReturn ? (
              <div className="card">
                <div className="card-body">
                  <label className="form-label">Enter Bill ID to Return</label>
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter Bill ID (e.g., BILL-1234567890)" 
                      value={returnBillId} 
                      onChange={(e) => setReturnBillId(e.target.value)} 
                    />
                    <button className="btn btn-primary" onClick={searchBillForReturn}>
                      <FaSearch /> Search Bill
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="card mb-3">
                  <div className="card-header bg-info text-white">Bill Information</div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Bill ID:</strong> {selectedBillForReturn.billId}</p>
                        <p><strong>Date:</strong> {new Date(selectedBillForReturn.date).toLocaleString()}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Customer:</strong> {selectedBillForReturn.customerName}</p>
                        <p><strong>Original Total:</strong> Rs.{selectedBillForReturn.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card mb-3">
                  <div className="card-header bg-warning text-white">Select Items to Return</div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead className="table-dark">
                          <tr>
                            <th width="50">Select</th>
                            <th>Product</th>
                            <th>Variant</th>
                            <th width="100">Original Qty</th>
                            <th width="120">Price</th>
                            <th width="150">Return Qty</th>
                            <th width="120">Refund Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnItems.map((item, index) => (
                            <tr key={index} className={item.selected ? 'table-info' : ''}>
                              <td className="text-center">
                                <input 
                                  type="checkbox" 
                                  className="form-check-input" 
                                  checked={item.selected || false}
                                  onChange={() => toggleReturnItem(index)}
                                />
                              </td>
                              <td>{item.productName}</td>
                              <td>{item.variantName || '-'}</td>
                              <td className="text-center">{item.quantity}</td>
                              <td>Rs.{item.price}</td>
                              <td>
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm" 
                                  value={item.returnQuantity || 0}
                                  onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                                  disabled={!item.selected}
                                  min="1"
                                  max={item.quantity}
                                  style={{ width: '100px' }}
                                />
                              </td>
                              <td className="text-success fw-bold">
                                Rs.{(item.selected ? item.price * (item.returnQuantity || 0) : 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-primary">
                          <tr>
                            <td colSpan="6" className="text-end"><strong>Total Refund:</strong></td>
                            <td><strong>Rs.{calculateTotalRefund().toFixed(2)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header bg-secondary text-white">Return Reason</div>
                  <div className="card-body">
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      placeholder="Please provide reason for return (e.g., defective product, wrong item, customer dissatisfaction, etc.)"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => {
              setShowReturnModal(false);
              setSelectedBillForReturn(null);
              setReturnItems([]);
              setReturnBillId('');
            }}>Cancel</button>
            {selectedBillForReturn && (
              <button className="btn btn-warning btn-lg" onClick={processReturn} disabled={calculateTotalRefund() === 0}>
                <FaExchangeAlt /> Process Return (Rs.{calculateTotalRefund().toFixed(2)})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Edit Bill Modal Component
  const renderEditBillModal = () => (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <FaEdit className="me-2" /> Edit Bill: {editingBill?.billId}
            </h5>
            <button type="button" className="btn-close" onClick={() => {
              setShowEditBillModal(false);
              setEditingBill(null);
              setEditBillItems([]);
            }}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-4">
                <div className="card mb-3">
                  <div className="card-header bg-primary text-white">Bill Information</div>
                  <div className="card-body">
                    <p><strong>Bill ID:</strong> {editingBill?.billId}</p>
                    <p><strong>Date:</strong> {new Date(editingBill?.date).toLocaleString()}</p>
                    <p><strong>Customer:</strong> {editingBill?.customerName}</p>
                    <p><strong>Phone:</strong> {editingBill?.customerPhone || '-'}</p>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header bg-success text-white">Update Payment Details</div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Payment Method</label>
                      <select className="form-select" value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Discount (Rs.)</label>
                      <input type="number" className="form-control" value={editDiscount} 
                        onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-8">
                <div className="card mb-3">
                  <div className="card-header bg-info text-white">Add More Products</div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <label className="form-label">Search Product</label>
                        <input type="text" className="form-control" placeholder="Type to search products..."
                          value={editProductSearch} onChange={(e) => setEditProductSearch(e.target.value)} />
                        {editProductSearch && (
                          <div className="list-group mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {products.filter(p => 
                              p.name.toLowerCase().includes(editProductSearch.toLowerCase())
                            ).slice(0, 10).map(product => (
                              <button key={product._id} type="button" className="list-group-item list-group-item-action"
                                onClick={() => {
                                  setEditSelectedProduct(product);
                                  setEditProductSearch('');
                                  toast.success(`Selected: ${product.name}`);
                                }}>
                                <div className="d-flex justify-content-between">
                                  <div>
                                    <strong>{product.name}</strong>
                                    <br />
                                    <small className="text-muted">
                                      {product.hasVariants ? `${product.variants?.length || 0} colors` : `Stock: ${product.defaultStock}`}
                                    </small>
                                  </div>
                                  <span className="text-success fw-bold">Rs.{product.basePrice}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Quantity</label>
                        <input type="number" className="form-control" value={editProductQuantity} 
                          onChange={(e) => setEditProductQuantity(parseInt(e.target.value) || 1)} min="1" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">&nbsp;</label>
                        <button className="btn btn-primary w-100" onClick={addEditBillItem} disabled={!editSelectedProduct}>
                          <FaPlus /> Add to Bill
                        </button>
                      </div>
                    </div>
                    
                    {editSelectedProduct && (
                      <div className="alert alert-info mt-3">
                        <strong>Selected:</strong> {editSelectedProduct.name} - Rs.{editSelectedProduct.basePrice}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header bg-warning">Bill Items</div>
                  <div className="card-body">
                    {editBillItems.length === 0 ? (
                      <p className="text-muted text-center">No items in this bill.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead className="table-dark">
                            <tr>
                              <th>Product</th>
                              <th>Variant</th>
                              <th width="100">Quantity</th>
                              <th width="120">Price (Rs.)</th>
                              <th width="120">Total (Rs.)</th>
                              <th width="50">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editBillItems.map((item, index) => (
                              <tr key={index}>
                                <td>{item.productName}</td>
                                <td>{item.variantName || '-'}</td>
                                <td>
                                  <input type="number" className="form-control form-control-sm" 
                                    value={item.quantity} onChange={(e) => updateEditBillQuantity(index, parseInt(e.target.value) || 0)} />
                                </td>
                                <td>
                                  <input type="number" className="form-control form-control-sm" 
                                    value={item.price} onChange={(e) => updateEditBillPrice(index, parseFloat(e.target.value) || 0)} step="1" />
                                </td>
                                <td>Rs.{item.total.toFixed(2)}</td>
                                <td>
                                  <button className="btn btn-sm btn-danger" onClick={() => removeEditBillItem(index)}>X</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-info">
                              <td colSpan="4" className="text-end"><strong>Subtotal:</strong></td>
                              <td colSpan="2"><strong>Rs.{editBillItems.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</strong></td>
                            </tr>
                            {editDiscount > 0 && (
                              <tr className="table-success">
                                <td colSpan="4" className="text-end"><strong>Discount:</strong></td>
                                <td colSpan="2"><strong>-Rs.{editDiscount.toFixed(2)}</strong></td>
                              </tr>
                            )}
                            <tr className="table-primary">
                              <td colSpan="4" className="text-end"><strong>Grand Total:</strong></td>
                              <td colSpan="2"><strong>Rs.{(editBillItems.reduce((sum, i) => sum + i.total, 0) - editDiscount).toFixed(2)}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => {
              setShowEditBillModal(false);
              setEditingBill(null);
              setEditBillItems([]);
            }}>Cancel</button>
            <button className="btn btn-warning btn-lg" onClick={updateBill}>
              <FaSave /> Update Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Manual Bill Modal
  const renderManualBillModal = () => (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <FaShoppingCart className="me-2" /> Create New Bill (Manual Entry)
            </h5>
            <button type="button" className="btn-close" onClick={() => {
              setShowBillModal(false);
              setManualBillItems([]);
              setSelectedCustomerId('');
              setManualDiscount(0);
              setIsCustomProduct(false);
              setCustomProductName('');
              setManualProductPrice(0);
            }}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-4">
                <div className="card mb-3">
                  <div className="card-header bg-primary text-white">Select Customer</div>
                  <div className="card-body">
                    <select className="form-select" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.name} - {c.phone} (Points: {c.loyaltyPoints || 0})
                        </option>
                      ))}
                    </select>
                    {selectedCustomerId && (
                      <div className="mt-3">
                        {customers.find(c => c._id === selectedCustomerId) && (
                          <>
                            <p><strong>Phone:</strong> {customers.find(c => c._id === selectedCustomerId)?.phone}</p>
                            <p><strong>Email:</strong> {customers.find(c => c._id === selectedCustomerId)?.email || '-'}</p>
                            <p><strong>Loyalty Points:</strong> {customers.find(c => c._id === selectedCustomerId)?.loyaltyPoints || 0}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header bg-success text-white">Payment Details</div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Payment Method</label>
                      <select className="form-select" value={manualPaymentMethod} onChange={(e) => setManualPaymentMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Discount (Rs.)</label>
                      <input type="number" className="form-control" value={manualDiscount} 
                        onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-8">
                <div className="card mb-3">
                  <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                    <span>Add Products</span>
                    <button className="btn btn-sm btn-light" onClick={() => setIsCustomProduct(!isCustomProduct)}>
                      <FaTag /> {isCustomProduct ? 'Add from Database' : 'Add Custom Product'}
                    </button>
                  </div>
                  <div className="card-body">
                    {!isCustomProduct ? (
                      <>
                        <div className="row">
                          <div className="col-md-12">
                            <label className="form-label">Search Product from Database</label>
                            <input type="text" className="form-control" placeholder="Type to search products..."
                              value={manualProductSearch} onChange={(e) => setManualProductSearch(e.target.value)} />
                            {manualProductSearch && (
                              <div className="list-group mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {products.filter(p => 
                                  p.name.toLowerCase().includes(manualProductSearch.toLowerCase())
                                ).slice(0, 10).map(product => (
                                  <button key={product._id} type="button" className="list-group-item list-group-item-action"
                                    onClick={() => {
                                      setSelectedProduct(product);
                                      setManualProductSearch('');
                                      toast.success(`Selected: ${product.name}`);
                                    }}>
                                    <div className="d-flex justify-content-between">
                                      <div>
                                        <strong>{product.name}</strong>
                                        <br />
                                        <small className="text-muted">
                                          {product.hasVariants ? `${product.variants?.length || 0} colors` : `Stock: ${product.defaultStock}`}
                                        </small>
                                      </div>
                                      <span className="text-success fw-bold">Rs.{product.basePrice}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="col-md-4 mt-3">
                            <label className="form-label">Quantity</label>
                            <input type="number" className="form-control" value={manualProductQuantity} 
                              onChange={(e) => setManualProductQuantity(parseInt(e.target.value) || 1)} min="1" />
                          </div>
                          <div className="col-md-8 mt-3">
                            <label className="form-label">&nbsp;</label>
                            <button className="btn btn-primary w-100" onClick={addManualBillItemFromDB} disabled={!selectedProduct}>
                              <FaPlus /> Add to Bill
                            </button>
                          </div>
                        </div>
                        
                        {selectedProduct && (
                          <div className="alert alert-info mt-3">
                            <strong>Selected:</strong> {selectedProduct.name} - Rs.{selectedProduct.basePrice}
                            {selectedProduct.hasVariants && (
                              <div className="mt-1">
                                <small>This product has {selectedProduct.variants?.length || 0} color variants</small>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="row">
                          <div className="col-md-12">
                            <label className="form-label">Product Name *</label>
                            <input type="text" className="form-control" placeholder="Enter product name"
                              value={customProductName} onChange={(e) => setCustomProductName(e.target.value)} />
                          </div>
                          <div className="col-md-4 mt-3">
                            <label className="form-label">Quantity *</label>
                            <input type="number" className="form-control" value={manualProductQuantity} 
                              onChange={(e) => setManualProductQuantity(parseInt(e.target.value) || 1)} min="1" />
                          </div>
                          <div className="col-md-4 mt-3">
                            <label className="form-label">Price (Rs.) *</label>
                            <input type="number" className="form-control" value={manualProductPrice} 
                              onChange={(e) => setManualProductPrice(parseFloat(e.target.value) || 0)} min="0" step="1" />
                          </div>
                          <div className="col-md-4 mt-3">
                            <label className="form-label">&nbsp;</label>
                            <button className="btn btn-success w-100" onClick={addCustomProduct}>
                              <FaPlus /> Add Custom Product
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header bg-warning">Bill Items</div>
                  <div className="card-body">
                    {manualBillItems.length === 0 ? (
                      <p className="text-muted text-center">No items added. Add products to create bill.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead className="table-dark">
                            <tr>
                              <th>Product</th>
                              <th width="100">Quantity</th>
                              <th width="120">Price (Rs.)</th>
                              <th width="120">Total (Rs.)</th>
                              <th width="50">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manualBillItems.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  {item.productName}
                                  {item.isCustom && <span className="badge bg-info ms-2">Custom</span>}
                                </td>
                                <td>
                                  <input type="number" className="form-control form-control-sm" 
                                    value={item.quantity} onChange={(e) => updateManualBillQuantity(index, parseInt(e.target.value) || 0)} />
                                </td>
                                <td>
                                  <input type="number" className="form-control form-control-sm" 
                                    value={item.price} onChange={(e) => updateManualBillPrice(index, parseFloat(e.target.value) || 0)} step="1" />
                                </td>
                                <td>Rs.{item.total.toFixed(2)}</td>
                                <td>
                                  <button className="btn btn-sm btn-danger" onClick={() => removeManualBillItem(index)}>X</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-info">
                              <td colSpan="3" className="text-end"><strong>Subtotal:</strong></td>
                              <td colSpan="2"><strong>Rs.{manualBillItems.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</strong></td>
                            </tr>
                            {manualDiscount > 0 && (
                              <tr className="table-success">
                                <td colSpan="3" className="text-end"><strong>Discount:</strong></td>
                                <td colSpan="2"><strong>-Rs.{manualDiscount.toFixed(2)}</strong></td>
                              </tr>
                            )}
                            <tr className="table-primary">
                              <td colSpan="3" className="text-end"><strong>Grand Total:</strong></td>
                              <td colSpan="2"><strong>Rs.{(manualBillItems.reduce((sum, i) => sum + i.total, 0) - manualDiscount).toFixed(2)}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => {
              setShowBillModal(false);
              setManualBillItems([]);
              setSelectedCustomerId('');
              setManualDiscount(0);
            }}>Cancel</button>
            <button className="btn btn-success btn-lg" onClick={createManualBill} disabled={manualBillItems.length === 0}>
              <FaPlus /> Create Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Quick Billing</h3>
        <button className="btn btn-primary btn-lg" onClick={() => setShowBillModal(true)}>
          <FaPlus /> Add New Bill (Manual)
        </button>
      </div>
      
      <div className="row">
        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-header bg-primary text-white">Select Customer</div>
            <div className="card-body">
              <select className="form-select" onChange={(e) => {
                const customer = customers.find(c => c._id === e.target.value);
                setSelectedCustomer(customer);
                setLoyaltyPointsToRedeem(0);
              }} value={selectedCustomer?._id || ''}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name} (Points: {c.loyaltyPoints || 0})</option>)}
              </select>
              {selectedCustomer && (
                <div className="mt-3">
                  <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Loyalty Points:</strong> {selectedCustomer.loyaltyPoints || 0}</p>
                  <div className="mt-2">
                    <label>Redeem Points (100 points = Rs.1):</label>
                    <input type="number" className="form-control" value={loyaltyPointsToRedeem} 
                      onChange={(e) => setLoyaltyPointsToRedeem(parseInt(e.target.value) || 0)} 
                      max={selectedCustomer.loyaltyPoints || 0} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header bg-success text-white">Products</div>
            <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <input type="text" className="form-control mb-3" placeholder="Search products..." 
                onChange={(e) => setGlobalSearchTerm(e.target.value)} />
              {products.filter(p => p.name.toLowerCase().includes(globalSearchTerm.toLowerCase())).map(product => {
                const totalStock = product.hasVariants 
                  ? product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
                  : product.defaultStock;
                
                return (
                  <div key={product._id} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <strong>{product.name}</strong>
                      {product.brand && <span className="text-muted ms-2">({product.brand})</span>}
                      <br />
                      <small>
                        {product.hasVariants 
                          ? `${product.variants?.length || 0} shades available` 
                          : `Rs.${product.basePrice} | Stock: ${product.defaultStock}`}
                      </small>
                      {product.hasVariants && product.variants && (
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {product.variants.slice(0, 5).map((v, idx) => (
                            <span key={idx} 
                              className="badge me-1" 
                              style={{ 
                                backgroundColor: v.colorCode || '#6c757d',
                                color: '#fff',
                                cursor: 'pointer'
                              }}
                              title={`${v.name} (Stock: ${v.stock})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (v.stock > 0) {
                                  addToCartWithVariant(product, v);
                                } else {
                                  toast.error(`${v.name} is out of stock`);
                                }
                              }}>
                              {v.name}
                            </span>
                          ))}
                          {product.variants.length > 5 && (
                            <span className="badge bg-secondary">+{product.variants.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={() => {
                        if (product.hasVariants && product.variants?.length > 0) {
                          setCurrentProductForVariant(product);
                          setShowVariantSelector(true);
                        } else {
                          addToCart(product);
                        }
                      }}
                      disabled={totalStock === 0}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-info text-white">Shopping Cart</div>
            <div className="card-body">
              {cart.length === 0 ? (
                <p className="text-muted text-center">Cart is empty. Add products to create a bill.</p>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-dark">
                        <tr>
                          <th>Product</th>
                          <th>Shade</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{item.productName}</strong>
                            </td>
                            <td>
                              {item.variantName ? (
                                <span className="badge" style={{ 
                                  backgroundColor: item.colorCode || '#6c757d',
                                  color: '#fff',
                                  padding: '5px 10px'
                                }}>
                                  {item.variantName}
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              <input type="number" className="form-control form-control-sm" style={{ width: '70px' }}
                                value={item.quantity} onChange={(e) => updateCartQuantity(index, parseInt(e.target.value) || 0)} />
                            </td>
                            <td>Rs.{item.price}</td>
                            <td>Rs.{item.total.toFixed(2)}</td>
                            <td><button className="btn btn-sm btn-danger" onClick={() => updateCartQuantity(index, 0)}>X</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-info">
                          <td colSpan="4" className="text-end"><strong>Subtotal:</strong></td>
                          <td colSpan="2"><strong>Rs.{cart.reduce((s, i) => s + i.total, 0).toFixed(2)}</strong></td>
                        </tr>
                        {loyaltyPointsToRedeem > 0 && (
                          <tr className="table-success">
                            <td colSpan="4" className="text-end"><strong>Discount:</strong></td>
                            <td colSpan="2"><strong>-Rs.{loyaltyPointsToRedeem.toFixed(2)}</strong></td>
                          </tr>
                        )}
                        <tr className="table-primary">
                          <td colSpan="4" className="text-end"><strong>Grand Total:</strong></td>
                          <td colSpan="2"><strong>Rs.{(cart.reduce((s, i) => s + i.total, 0) - loyaltyPointsToRedeem).toFixed(2)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="text-end mt-3">
                    <h6 className="text-info">
                      Loyalty Points to Earn: {Math.floor((cart.reduce((s, i) => s + i.total, 0) - loyaltyPointsToRedeem) / 100)}
                    </h6>
                    <button className="btn btn-success btn-lg mt-2" onClick={createBill}>
                      Generate Bill
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBills = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>All Bills</h3>
        <div>
          <button className="btn btn-primary me-2" onClick={() => setShowBillModal(true)}>
            <FaPlus /> Add New Bill
          </button>
          <button className="btn btn-warning" onClick={openReturnModal}>
            <FaExchangeAlt /> Process Return
          </button>
        </div>
      </div>
      
      <div className="row mb-3">
        <div className="col-md-3">
          <div className="input-group">
            <span className="input-group-text"><FaSearch /></span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by Bill ID or Customer..." 
              value={billSearchTerm} 
              onChange={(e) => {
                setBillSearchTerm(e.target.value);
                setCurrentPage(1);
                fetchBills(1);
              }} 
            />
          </div>
        </div>
        <div className="col-md-3">
          <input 
            type="date" 
            className="form-control" 
            placeholder="Start Date" 
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
          />
        </div>
        <div className="col-md-3">
          <input 
            type="date" 
            className="form-control" 
            placeholder="End Date" 
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
          />
        </div>
        <div className="col-md-3">
          <button className="btn btn-primary me-2" onClick={() => fetchBills(1)}>
            <FaSearch /> Filter
          </button>
          <button className="btn btn-success" onClick={() => window.open(`${API_URL}/export/bills?startDate=${dateRange.start}&endDate=${dateRange.end}`, '_blank')}>
            <FaDownload /> Export Excel
          </button>
        </div>
      </div>
      
      {(billSearchTerm || dateRange.start || dateRange.end) && (
        <div className="mb-3">
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => {
              setBillSearchTerm('');
              setDateRange({ start: '', end: '' });
              fetchBills(1);
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-dark">
            <tr>
              <th>Bill ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No bills found. {billSearchTerm && 'Try a different search term.'}
                </td>
              </tr>
            ) : (
              bills.map(bill => (
                <tr key={bill._id}>
                  <td>{bill.billId}</td>
                  <td>{bill.customerName}</td>
                  <td>{new Date(bill.date).toLocaleDateString()}</td>
                  <td>Rs.{bill.total.toFixed(2)}</td>
                  <td>
                    <button className="btn btn-sm btn-warning me-2" onClick={() => openEditBillModal(bill)}>
                      <FaEdit /> Edit
                    </button>
                    <button className="btn btn-sm btn-info me-2" onClick={() => printBill(bill)}><FaPrint /> Print</button>
                    <button className="btn btn-sm btn-success me-2" onClick={() => downloadPDF(bill._id)}><FaDownload /> PDF</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete('bill', bill._id)}><FaTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchBills(currentPage - 1)}>Previous</button>
              </li>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) return null;
                }
                return (
                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => fetchBills(pageNum)}>{pageNum}</button>
                  </li>
                );
              })}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => fetchBills(currentPage + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );

  const renderCustomers = () => (
    <div>
      <div className="d-flex justify-content-between mb-4">
        <h3>Customers</h3>
        <div>
          <button className="btn btn-primary me-2" onClick={() => {
            setModalType('customer');
            setFormData({ customerId: `CUST-${Date.now()}`, name: '', email: '', phone: '', address: '' });
            setShowModal(true);
          }}><FaPlus /> Add Customer</button>
          <button className="btn btn-secondary" onClick={() => document.getElementById('importFile').click()}>
            <FaUpload /> Import
          </button>
          <input type="file" id="importFile" style={{ display: 'none' }} accept=".json" onChange={(e) => handleBulkImport('customer', e.target.files[0])} />
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Points</th>
              <th>Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer._id}>
                <td>{customer.customerId}</td>
                <td>{customer.name}</td>
                <td>{customer.email || '-'}</td>
                <td>{customer.phone}</td>
                <td>{customer.address || '-'}</td>
                <td>{customer.loyaltyPoints || 0}</td>
                <td>Rs.{customer.totalSpent?.toFixed(2) || 0}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-2" onClick={() => { setModalType('customer'); setEditingItem(customer); setFormData(customer); setShowModal(true); }}><FaEdit /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete('customer', customer._id)}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div>
      <div className="d-flex justify-content-between mb-4">
        <h3>Products</h3>
        <div>
          <select className="form-select me-2 d-inline-block w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary me-2" onClick={() => {
            setModalType('product');
            setFormData({ 
              productId: `PROD-${Date.now()}`, 
              name: '', 
              category: '', 
              brand: '',
              basePrice: 0, 
              defaultStock: 0, 
              hasVariants: false,
              variants: [],
              description: '' 
            });
            setShowModal(true);
          }}><FaPlus /> Add Product</button>
          <button className="btn btn-secondary" onClick={() => document.getElementById('importProductFile').click()}>
            <FaUpload /> Import
          </button>
          <input type="file" id="importProductFile" style={{ display: 'none' }} accept=".json" onChange={(e) => handleBulkImport('product', e.target.files[0])} />
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock/Variants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const totalStock = product.hasVariants 
                ? product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0
                : product.defaultStock;
              
              return (
                <tr key={product._id}>
                  <td>{product.productId}</td>
                  <td>{product.name}</td>
                  <td>{product.brand || '-'}</td>
                  <td>{product.category}</td>
                  <td>Rs.{product.basePrice || 0}</td>
                  <td className={totalStock < 10 ? 'text-danger fw-bold' : ''}>
                    {product.hasVariants ? (
                      <div>
                        <span className="badge bg-info me-2">{product.variants?.length || 0} shades</span>
                        <span>Total Stock: {totalStock}</span>
                      </div>
                    ) : (
                      `Stock: ${product.defaultStock}`
                    )}
                   </td>
                  <td>
                    <button className="btn btn-sm btn-info me-2" onClick={() => {
                      setSelectedProductForVariants(product);
                      setShowVariantManager(true);
                    }}>
                      <FaPalette /> Shades
                    </button>
                    <button className="btn btn-sm btn-warning me-2" onClick={() => { 
                      setModalType('product'); 
                      setEditingItem(product); 
                      setFormData(product); 
                      setShowModal(true); 
                    }}><FaEdit /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete('product', product._id)}><FaTrash /></button>
                   </td>
                 </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReturns = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Returns & Refunds</h3>
        <button className="btn btn-primary" onClick={openReturnModal}>
          <FaExchangeAlt /> Process New Return
        </button>
      </div>
      
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-dark">
            <tr>
              <th>Return ID</th>
              <th>Original Bill</th>
              <th>Customer</th>
              <th>Items Returned</th>
              <th>Refund Amount</th>
              <th>Reason</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  No returns processed yet. Click "Process New Return" to return items.
                 </td>
               </tr>
            ) : (
              returns.map(returnItem => (
                <tr key={returnItem._id}>
                  <td>{returnItem.returnId}</td>
                  <td>{returnItem.originalBillId}</td>
                  <td>{returnItem.customerName}</td>
                  <td>
                    {returnItem.items.map((item, idx) => (
                      <div key={idx}>
                        {item.productName} {item.variantName ? `(${item.variantName})` : ''} x{item.quantity}
                      </div>
                    ))}
                  </td>
                  <td><span className="text-danger fw-bold">-Rs.{returnItem.totalRefund.toFixed(2)}</span></td>
                  <td>{returnItem.reason}</td>
                  <td>{new Date(returnItem.date).toLocaleDateString()}</td>
                  <td><span className="badge bg-success">Approved</span></td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete('return', returnItem._id)}>
                      <FaTrash /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="table-primary">
            <tr>
              <td colSpan="4" className="text-end"><strong>Total Refunds:</strong></td>
              <td colSpan="5"><strong>Rs.{returns.reduce((sum, r) => sum + r.totalRefund, 0).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className={`App ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <Toaster position="top-right" />
      
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand h1">GlowHaven</span>
          <div className="d-flex ms-auto">
            <div className="input-group me-3" style={{ width: '250px' }}>
              <span className="input-group-text"><FaSearch /></span>
              <input type="text" className="form-control" placeholder="Search..." value={globalSearchTerm} onChange={(e) => setGlobalSearchTerm(e.target.value)} />
            </div>
            <button className="btn btn-outline-light" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          <div className="col-md-2 mb-4">
            <div className="list-group">
              <button className={`list-group-item list-group-item-action ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                <FaShoppingCart /> Quick Billing
              </button>
              <button className={`list-group-item list-group-item-action ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}>
                <FaFileInvoice /> Bills
              </button>
              <button className={`list-group-item list-group-item-action ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                <FaBoxes /> Products
              </button>
              <button className={`list-group-item list-group-item-action ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
                <FaUsers /> Customers
              </button>
              <button className={`list-group-item list-group-item-action ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>
                <FaUndo /> Returns
              </button>
            </div>
          </div>
          <div className="col-md-10">
            <div className="card">
              <div className="card-body">
                {activeTab === 'billing' && renderBilling()}
                {activeTab === 'bills' && renderBills()}
                {activeTab === 'customers' && renderCustomers()}
                {activeTab === 'products' && renderProducts()}
                {activeTab === 'returns' && renderReturns()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingItem ? 'Edit' : 'Add'} {modalType}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {Object.keys(formData).map(key => {
                    if (['_id', '__v', 'createdAt', 'lastPurchase', 'totalSpent', 'loyaltyPoints', 'items', 'variants'].includes(key)) return null;
                    if (key === 'hasVariants') {
                      return (
                        <div className="mb-3" key={key}>
                          <div className="form-check">
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              id="hasVariants"
                              checked={formData.hasVariants || false}
                              onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="hasVariants">
                              This product has colors/shades (variants)
                            </label>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mb-3" key={key}>
                        <label className="form-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                        <input type={key === 'basePrice' || key === 'defaultStock' ? 'number' : 'text'} 
                          className="form-control" value={formData[key] || ''} 
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} required />
                      </div>
                    );
                  })}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showBillModal && renderManualBillModal()}
      {showEditBillModal && renderEditBillModal()}
      {showReturnModal && renderReturnModal()}
      {showVariantSelector && renderVariantSelector()}
      {showVariantManager && selectedProductForVariants && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-body p-0">
                <ProductVariantManager 
                  product={selectedProductForVariants}
                  onVariantUpdate={(updatedProduct) => {
                    fetchProducts();
                    setShowVariantManager(false);
                  }}
                  onClose={() => setShowVariantManager(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
