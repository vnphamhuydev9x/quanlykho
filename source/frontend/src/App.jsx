import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh-cn';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EmployeeList from './pages/EmployeeList';
import CustomerList from './pages/CustomerList';
import WarehousePage from './pages/warehouse/WarehousePage';
import CategoryPage from './pages/category/CategoryPage';
import MerchandiseConditionPage from './pages/merchandiseCondition/MerchandiseConditionPage';
import DeclarationPage from './pages/declaration/DeclarationPage';
import TransactionPage from './pages/transaction/TransactionPage';

import ShortDeclarationList from './pages/shortDeclaration/ShortDeclarationList';
import ProductCodePage from './pages/productCode/ProductCodePage';
import MerchandisePage from './pages/merchandise/MerchandisePage';
import ManifestListPage from './pages/manifest/ManifestListPage';
import ManifestDetailPage from './pages/manifest/ManifestDetailPage';
import ExportOrderListPage from './pages/exportOrder/ExportOrderListPage';
import DebtPage from './pages/debt/DebtPage';
import DebtDetailPage from './pages/debt/DebtDetailPage';
import InquiryPage from './pages/inquiry/InquiryPage';
import NotificationPage from './pages/notification/NotificationPage';
import LandingPage from './pages/landing/LandingPage';
import MainLayout from './layouts/MainLayout';

// Set dayjs global locale to Vietnamese
dayjs.locale('vi');

// Dynamic Ant Design locale based on i18n language
const LocaleProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const antLocale = i18n.language === 'zh' ? zhCN : viVN;
  dayjs.locale(i18n.language === 'zh' ? 'zh-cn' : 'vi');
  return <ConfigProvider locale={antLocale}>{children}</ConfigProvider>;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <LocaleProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Public landing page — không cần auth */}
          <Route path="/consulting" element={<LandingPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/employees"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmployeeList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/warehouses"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <WarehousePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/categories"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CategoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/merchandise-conditions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MerchandiseConditionPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/short-declarations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ShortDeclarationList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/declarations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DeclarationPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-codes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProductCodePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchandise"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MerchandisePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manifests"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ManifestListPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manifests/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ManifestDetailPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TransactionPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/export-orders"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ExportOrderListPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CustomerList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bao-cao/cong-no"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DebtPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bao-cao/cong-no/:customerId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DebtDetailPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-inquiry"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InquiryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notification-history"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          {/* Redirect unknown routes to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LocaleProvider>
    </Router>
  );
}

export default App;
