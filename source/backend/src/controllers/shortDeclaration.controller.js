const shortDeclarationService = require('../services/shortDeclaration.service');

class ShortDeclarationController {

    async getAll(req, res) {
        try {
            const data = await shortDeclarationService.getAll(req.query);
            return res.json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }

    async getById(req, res) {
        try {
            const data = await shortDeclarationService.getById(req.params.id);
            return res.json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }

    async create(req, res) {
        try {
            // Validation input
            const body = req.body;
            if (!body.productName) {
                return res.status(400).json({ success: false, code: 99001, message: 'Missing product name' });
            }

            const data = await shortDeclarationService.create(body);
            return res.json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }

    async update(req, res) {
        try {
            const data = await shortDeclarationService.update(req.params.id, req.body);
            return res.json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }

    async delete(req, res) {
        try {
            await shortDeclarationService.delete(req.params.id);
            return res.json({ success: true });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }

    async uploadExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, code: 99001, message: 'No file uploaded' });
            }
            const data = await shortDeclarationService.uploadExcel(req.file.buffer);
            return res.json({ success: true, data });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, code: error.code || 99500, message: error.message, data: error.data });
        }
    }
}

module.exports = new ShortDeclarationController();
