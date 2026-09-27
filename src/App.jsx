import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Customers from './pages/Customers.jsx';
import CustomerForm from './pages/CustomerForm.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Orders from './pages/Orders.jsx';
import OrderCreate from './pages/OrderCreate.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Billing from './pages/Billing.jsx';
import BillPreview from './pages/BillPreview.jsx';
import StandaloneBill from './pages/StandaloneBill.jsx';
import Bills from './pages/Bills.jsx';
import BillDetail from './pages/BillDetail.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/products', label: 'Products', icon: '▣' },
  { to: '/customers', label: 'Customers', icon: '◉' },
  { to: '/orders', label: 'Orders', icon: '≡' },
  { to: '/billing', label: 'Billing', icon: '₹' },
  { to: '/bills', label: 'Bills', icon: '▤' },
];

function Layout() {
  return (
    <div className="app">
      <aside className="sidebar no-print">
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>Glowhaven Billing app</strong>
            <small>+91 8910434478</small>
            <small>Inventory &amp; Billing</small>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">Single-user v1 · no auth</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/edit" element={<CustomerForm />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/new" element={<OrderCreate />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/order/:orderId" element={<BillPreview />} />
          <Route path="/billing/new" element={<StandaloneBill />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="*" element={<div className="card">Page not found.</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
