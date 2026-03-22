import React from 'react';
import { Navigate } from 'react-router-dom';

const FeatureRoute = ({ featureEnv, children }) => {
    // Nếu hệ thống config là 'false' -> Từ chối truy cập và chuyển hướng về màn hình chính (Tư Vấn)
    if (import.meta.env[featureEnv] === 'false') {
        return <Navigate to="/customer-inquiry" replace />;
    }
    return children;
};

export default FeatureRoute;
