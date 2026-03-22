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
import FeatureRoute from './components/FeatureRoute';

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
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <LocaleProvider>
        <Routes>
          {/* Public landing pages */}
          <Route path="/" element={<Navigate to="/consulting" replace />} />
          <Route path="/consulting" element={<LandingPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Navigate to="/admin/customer-inquiry" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings/employees"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmployeeList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings/warehouses"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_SETTINGS">
                    <WarehousePage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings/categories"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_SETTINGS">
                    <CategoryPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings/merchandise-conditions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_SETTINGS">
                    <MerchandiseConditionPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/short-declarations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_DECLARATIONS">
                    <ShortDeclarationList />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/declarations"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_DECLARATIONS">
                    <DeclarationPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-codes"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
                    <ProductCodePage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/merchandise"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
                    <MerchandisePage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manifests"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
                    <ManifestListPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manifests/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
                    <ManifestDetailPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_TRANSACTIONS">
                    <TransactionPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/export-orders"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_INVENTORY">
                    <ExportOrderListPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_CUSTOMERS">
                    <CustomerList />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bao-cao/cong-no"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_TRANSACTIONS">
                    <DebtPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bao-cao/cong-no/:customerId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <FeatureRoute featureEnv="VITE_FEATURE_TRANSACTIONS">
                    <DebtDetailPage />
                  </FeatureRoute>
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customer-inquiry"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <InquiryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notification-history"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          {/* Redirect unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/consulting" replace />} />
        </Routes>
      </LocaleProvider>
    </Router>
  );
}

export default App;
