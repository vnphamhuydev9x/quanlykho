const logger = require('../config/logger');

const featureToggle = (featureEnvVar) => {
    return (req, res, next) => {
        // Nếu biến môi trường cài là "false" -> Chặn
        if (process.env[featureEnvVar] === 'false') {
            logger.warn(`[FeatureToggle] Request BLOCKED for disabled feature ${featureEnvVar} on ${req.originalUrl}`);
            return res.status(403).json({ 
                code: 403, 
                message: "Tính năng hệ thống đang được bảo trì hoặc chưa bật trên server này." 
            });
        }
        next();
    };
};

module.exports = featureToggle;
