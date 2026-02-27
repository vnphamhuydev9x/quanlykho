// Package Unit Enums
export const PACKAGE_UNIT = {
    CARTON: 'CARTON',
    PALLET: 'PALLET'
};

// VAT Export Status Enums
export const VAT_STATUS = {
    NOT_ISSUED: 'NOT_ISSUED',
    ISSUED_NOT_PACKAGED: 'ISSUED_NOT_PACKAGED',
    ISSUED_PACKAGED: 'ISSUED_PACKAGED'
};

// Product Code Status Enums
export const PRODUCT_STATUS = {
    ENTERED_WAREHOUSE: 'ENTERED_WAREHOUSE',
    WAITING_FOR_LOADING: 'WAITING_FOR_LOADING',
    LOADING_IN_CHINA: 'LOADING_IN_CHINA',
    CUSTOMS_INSPECTION: 'CUSTOMS_INSPECTION',
    WAITING_FOR_VN_CUSTOMS: 'WAITING_FOR_VN_CUSTOMS',
    CLEARED_CUSTOMS: 'CLEARED_CUSTOMS',
    LOADED: 'LOADED'
};

// Declaration Status Enums
export const DECLARATION_STATUS = {
    EXPECTED_ENTRY: 'EXPECTED_ENTRY'
};

// === ENUM VALUES (For Logic) ===

// General Info Source Enums
export const INFO_SOURCE = {
    KHO_TQ: 'KHO_TQ',
    KHO_VN: 'KHO_VN',
    CUSTOMER: 'CUSTOMER',
    EXPECTED_ENTRY: 'EXPECTED_ENTRY'
};

// Filter Status Enums
export const STATUS_FILTER = {
    ALL: 'all',
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

// Common Status Enums (Warehouse, Category)
export const COMMON_STATUS = {
    AVAILABLE: 'AVAILABLE',
    UNAVAILABLE: 'UNAVAILABLE'
};

// Transaction Status Enums
export const TRANSACTION_STATUS = {
    SUCCESS: 'SUCCESS',
    CANCELLED: 'CANCELLED'
};

// System Roles
export const ROLES = {
    ADMIN: 'ADMIN',
    SALE: 'SALE',
    KHO_TQ: 'KHO_TQ',
    KE_TOAN: 'KE_TOAN',
    DIEU_VAN: 'DIEU_VAN',
    KHO_VN: 'KHO_VN',
    CHUNG_TU: 'CHUNG_TU'
};

// === ARRAY OPTIONS FOR UI SELECTION BOXES ===

export const INFO_SOURCE_OPTIONS = [
    { value: INFO_SOURCE.KHO_TQ, labelKey: 'infoSource.khoTq' },
    { value: INFO_SOURCE.KHO_VN, labelKey: 'infoSource.khoVn' },
    { value: INFO_SOURCE.CUSTOMER, labelKey: 'infoSource.customer' },
    { value: INFO_SOURCE.EXPECTED_ENTRY, labelKey: 'infoSource.expectedEntry' }
];

export const PACKAGE_UNIT_OPTIONS = [
    { value: PACKAGE_UNIT.CARTON, labelKey: 'productCode.unitThungCarton' },
    { value: PACKAGE_UNIT.PALLET, labelKey: 'productCode.unitPallet' }
];

export const VAT_STATUS_OPTIONS = [
    { value: VAT_STATUS.NOT_ISSUED, labelKey: 'productCode.vatChuaXuat' },
    { value: VAT_STATUS.ISSUED_NOT_PACKAGED, labelKey: 'productCode.vatDaXuatChuaDongGoi' },
    { value: VAT_STATUS.ISSUED_PACKAGED, labelKey: 'productCode.vatDaXuatDaDongGoi' }
];

export const STATUS_FILTER_OPTIONS = [
    { value: STATUS_FILTER.ACTIVE, labelKey: 'employee.active' },
    { value: STATUS_FILTER.INACTIVE, labelKey: 'employee.inactive' }
];

export const CUSTOMER_STATUS_FILTER_OPTIONS = [
    { value: STATUS_FILTER.ACTIVE, labelKey: 'customer.active' },
    { value: STATUS_FILTER.INACTIVE, labelKey: 'customer.inactive' }
];

export const WAREHOUSE_STATUS_OPTIONS = [
    { value: COMMON_STATUS.AVAILABLE, labelKey: 'warehouse.available' },
    { value: COMMON_STATUS.UNAVAILABLE, labelKey: 'warehouse.unavailable' }
];

export const CATEGORY_STATUS_OPTIONS = [
    { value: COMMON_STATUS.AVAILABLE, labelKey: 'category.available' },
    { value: COMMON_STATUS.UNAVAILABLE, labelKey: 'category.unavailable' }
];

export const TRANSACTION_STATUS_OPTIONS = [
    { value: TRANSACTION_STATUS.SUCCESS, labelKey: 'transaction.success' },
    { value: TRANSACTION_STATUS.CANCELLED, labelKey: 'transaction.cancelled' }
];

export const ROLES_OPTIONS = [
    { value: ROLES.ADMIN, labelKey: 'roles.ADMIN' },
    { value: ROLES.SALE, labelKey: 'roles.SALE' },
    { value: ROLES.KHO_TQ, labelKey: 'roles.KHO_TQ' },
    { value: ROLES.KE_TOAN, labelKey: 'roles.KE_TOAN' },
    { value: ROLES.DIEU_VAN, labelKey: 'roles.DIEU_VAN' },
    { value: ROLES.KHO_VN, labelKey: 'roles.KHO_VN' },
    { value: ROLES.CHUNG_TU, labelKey: 'roles.CHUNG_TU' }
];
