const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/***********************************/
/* SOFT DELETE MIDDLEWARE */
/***********************************/

// Middleware 1: Convert DELETE to UPDATE (set deletedAt)
prisma.$use(async (params, next) => {
    // Check if model supports soft delete (User, Warehouse, Category)
    if (params.model === 'User' || params.model === 'Warehouse' || params.model === 'Category') {
        if (params.action === 'delete') {
            // Change to update
            params.action = 'update';
            params.args['data'] = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
            // Change to updateMany
            params.action = 'updateMany';
            if (params.args.data !== undefined) {
                params.args.data['deletedAt'] = new Date();
            } else {
                params.args['data'] = { deletedAt: new Date() };
            }
        }
    }
    return next(params);
});

// NOTE: We do NOT auto-filter deletedAt in queries.
// Each query must explicitly add "deletedAt: null" for clarity.

module.exports = prisma;
