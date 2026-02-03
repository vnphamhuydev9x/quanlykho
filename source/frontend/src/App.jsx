import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EmployeeList from './pages/EmployeeList';
import CustomerList from './pages/CustomerList';
import WarehousePage from './pages/warehouse/WarehousePage';
import CategoryPage from './pages/category/CategoryPage';
import TransactionPage from './pages/transaction/TransactionPage';
import MainLayout from './layouts/MainLayout';

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
      <Routes>
        <Route path="/login" element={<Login />} />
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
          path="/customers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CustomerList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirect unknown routes to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
