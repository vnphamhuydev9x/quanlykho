const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            code: 99003, // Token Missing
            message: 'Không tìm thấy Token'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) {
            return res.status(403).json({
                code: 99004, // Token Invalid
                message: 'Token không hợp lệ hoặc hết hạn'
            });
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
