import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { CartProvider } from './context/CartContext';
import { AdminDataProvider } from './context/AdminDataContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Toast } from './components/ui/Toast';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';

// Admin Panel Pages & Layout
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminFinancialReportsPage } from './pages/admin/AdminFinancialReportsPage';
import { AdminDiscountsPage } from './pages/admin/AdminDiscountsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

// Storefront Wrapper (renders standard store Header and Footer)
const StorefrontWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white"
      dir="rtl"
    >
      <Header />
      <main className="flex-1 pt-32 sm:pt-36">{children}</main>
      <Toast />
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AdminDataProvider>
          <CartProvider>
            <Routes>
            {/* Storefront Routes */}
            <Route
              path="/"
              element={
                <StorefrontWrapper>
                  <HomePage />
                </StorefrontWrapper>
              }
            />
            <Route
              path="/catalog"
              element={
                <StorefrontWrapper>
                  <CatalogPage />
                </StorefrontWrapper>
              }
            />
            <Route
              path="/product/:slug"
              element={
                <StorefrontWrapper>
                  <ProductDetailPage />
                </StorefrontWrapper>
              }
            />
            <Route
              path="/cart"
              element={
                <StorefrontWrapper>
                  <CartPage />
                </StorefrontWrapper>
              }
            />
            <Route
              path="/checkout"
              element={
                <StorefrontWrapper>
                  <CheckoutPage />
                </StorefrontWrapper>
              }
            />

            {/* Admin Panel Routes */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminLayout>
                  <AdminProductsPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminLayout>
                  <AdminOrdersPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminLayout>
                  <AdminUsersPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminLayout>
                  <AdminFinancialReportsPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/discounts"
              element={
                <AdminLayout>
                  <AdminDiscountsPage />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminLayout>
                  <AdminSettingsPage />
                </AdminLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AdminDataProvider>
    </HashRouter>
  </QueryClientProvider>
);
}
