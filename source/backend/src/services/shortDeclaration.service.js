const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const xlsx = require('xlsx');

// Helper to calculate SHA-256 hash from 9 fields
const calculateHash = (data) => {
    const fields = [
        data.productName || '',
        data.hsCode || '',
        data.origin || '',
        data.unit1 || '',
        data.unit2 || '',
        data.importTaxCode || '',
        data.importTaxRate !== undefined && data.importTaxRate !== null ? data.importTaxRate.toString() : '',
        data.vatTaxCode || '',
        data.vatTaxRate !== undefined && data.vatTaxRate !== null ? data.vatTaxRate.toString() : ''
    ];

    // Join with a specific separator to ensure exact string matching
    const stringToHash = fields.join('|||');
    return crypto.createHash('sha256').update(stringToHash).digest('hex');
};

// Helper for Exact Match check (Step 2 to avoid collision)
const isExactMatch = (record, newData) => {
    return (
        (record.productName || '') === (newData.productName || '') &&
        (record.hsCode || '') === (newData.hsCode || '') &&
        (record.origin || '') === (newData.origin || '') &&
        (record.unit1 || '') === (newData.unit1 || '') &&
        (record.unit2 || '') === (newData.unit2 || '') &&
        (record.importTaxCode || '') === (newData.importTaxCode || '') &&
        Number(record.importTaxRate || 0) === Number(newData.importTaxRate || 0) &&
        (record.vatTaxCode || '') === (newData.vatTaxCode || '') &&
        Number(record.vatTaxRate || 0) === Number(newData.vatTaxRate || 0)
    );
};

// Check for duplicates
const checkDuplicate = async (newData, currentId = null) => {
    const hash = calculateHash(newData);

    // Step 1: Fast query by hash index
    const candidates = await prisma.shortDeclaration.findMany({
        where: {
            hash: hash,
            deletedAt: null,
            ...(currentId ? { id: { not: currentId } } : {})
        }
    });

    // Step 2: Exact loop check for collisions
    for (const candidate of candidates) {
        if (isExactMatch(candidate, newData)) {
            return candidate; // Found a true duplicate
        }
    }

    return null; // No duplicate
};

class ShortDeclarationService {

    async getAll(query) {
        const { page = 1, limit = 20, search } = query;
        const skip = (page - 1) * limit;

        const where = { deletedAt: null };

        if (search) {
            where.OR = [
                { productName: { contains: search, mode: 'insensitive' } },
                { hsCode: { contains: search, mode: 'insensitive' } },
                { origin: { contains: search, mode: 'insensitive' } },
                { importTaxCode: { contains: search, mode: 'insensitive' } },
                { vatTaxCode: { contains: search, mode: 'insensitive' } },
            ];

            // Allow search by ID
            if (!isNaN(search)) {
                where.OR.push({ id: parseInt(search) });
            }
        }

        const [items, total] = await Promise.all([
            prisma.shortDeclaration.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.shortDeclaration.count({ where })
        ]);

        return {
            items,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        };
    }

    async getById(id) {
        const item = await prisma.shortDeclaration.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });

        if (!item) {
            const error = new Error('Product code not found');
            error.code = 99006;
            throw error;
        }

        return item;
    }

    async create(data) {
        const existing = await checkDuplicate(data);
        if (existing) {
            const error = new Error(`Đã tồn tại tờ khai rút gọn với ID: ${existing.id}`);
            error.code = 99015;
            error.data = { id: existing.id };
            throw error;
        }

        data.hash = calculateHash(data);

        const newItem = await prisma.shortDeclaration.create({
            data
        });

        console.info(`[ShortDeclarationService.create] Success. New ID: ${newItem.id}`);
        return newItem;
    }

    async update(id, data) {
        const existing = await checkDuplicate(data, parseInt(id));
        if (existing) {
            const error = new Error(`Đã tồn tại tờ khai rút gọn với ID: ${existing.id}`);
            error.code = 99015;
            error.data = { id: existing.id };
            throw error;
        }

        data.hash = calculateHash(data);

        const updatedItem = await prisma.shortDeclaration.update({
            where: { id: parseInt(id) },
            data
        });

        console.info(`[ShortDeclarationService.update] Success. Updated ID: ${id}`);
        return updatedItem;
    }

    async delete(id) {
        await prisma.shortDeclaration.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });

        console.info(`[ShortDeclarationService.delete] Success. Deleted ID: ${id}`);
        return true;
    }

    async uploadExcel(fileBuffer) {
        let totalProcessed = 0;
        let totalSkipped = 0;

        try {
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Assuming the first row is headers, skip it
            const rawData = xlsx.utils.sheet_to_json(worksheet);

            for (const row of rawData) {
                // Map from Excel headers to DB fields. 
                // We assume these are the standard translated headers.
                const rowData = {
                    productName: row['Tên hàng (mô tả chi tiết)'] ? String(row['Tên hàng (mô tả chi tiết)']) : (row['Tên hàng'] ? String(row['Tên hàng']) : null),
                    hsCode: row['Mã HS'] !== undefined && row['Mã HS'] !== null ? String(row['Mã HS']) : null,
                    origin: row['Xuất xứ'] !== undefined && row['Xuất xứ'] !== null ? String(row['Xuất xứ']) : null,
                    unit1: row['Đơn vị tính'] !== undefined && row['Đơn vị tính'] !== null ? String(row['Đơn vị tính']) : null,
                    unit2: row['Đơn vị tính 2'] !== undefined && row['Đơn vị tính 2'] !== null ? String(row['Đơn vị tính 2']) : null,
                    importTaxCode: row['Mã biểu thuế NK'] !== undefined && row['Mã biểu thuế NK'] !== null ? String(row['Mã biểu thuế NK']) : null,
                    importTaxRate: row['TS NK(%)'] !== undefined && row['TS NK(%)'] !== null ? parseFloat(row['TS NK(%)']) : null,
                    vatTaxCode: row['Mã biểu thuế VAT'] !== undefined && row['Mã biểu thuế VAT'] !== null ? String(row['Mã biểu thuế VAT']) : null,
                    vatTaxRate: row['Thuế suất VAT(%)'] !== undefined && row['Thuế suất VAT(%)'] !== null ? parseFloat(row['Thuế suất VAT(%)']) : null,
                };

                // Exclude empty rows
                if (!rowData.productName && !rowData.hsCode) {
                    continue;
                }

                // Check duplicate (2-step check)
                const existing = await checkDuplicate(rowData);
                if (existing) {
                    // Silent ignore as per requirements
                    totalSkipped++;
                    continue;
                }

                rowData.hash = calculateHash(rowData);

                await prisma.shortDeclaration.create({
                    data: rowData
                });

                totalProcessed++;
            }

            console.info(`[ShortDeclarationService.uploadExcel] Done. Processed: ${totalProcessed}, Skipped: ${totalSkipped}`);
            return { processed: totalProcessed, skipped: totalSkipped };

        } catch (error) {
            console.error(`[ShortDeclarationService.uploadExcel] Error at buffer (${fileBuffer?.length}):\n${error.stack}`);
            const err = new Error('Lỗi xử lý file Excel');
            err.code = 99500;
            throw err;
        }
    }
}

module.exports = new ShortDeclarationService();
