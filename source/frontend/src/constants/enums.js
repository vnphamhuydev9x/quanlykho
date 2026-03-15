// Package Unit Enums
export const PACKAGE_UNIT = {
    KHONG_DONG_GOI: 'KHONG_DONG_GOI',
    BAO_TAI: 'BAO_TAI',
    THUNG_CARTON: 'THUNG_CARTON',
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

export const LOADING_STATUS = {
    CHUA_XEP_XE: 'CHUA_XEP_XE',
    CHO_XEP_XE: 'CHO_XEP_XE',
    DA_XEP_XE: 'DA_XEP_XE'
};

// === ARRAY OPTIONS FOR UI SELECTION BOXES ===

export const INFO_SOURCE_OPTIONS = [
    { value: INFO_SOURCE.KHO_TQ, labelKey: 'infoSource.khoTq' },
    { value: INFO_SOURCE.KHO_VN, labelKey: 'infoSource.khoVn' },
    { value: INFO_SOURCE.CUSTOMER, labelKey: 'infoSource.customer' },
    { value: INFO_SOURCE.EXPECTED_ENTRY, labelKey: 'infoSource.expectedEntry' }
];

export const PACKAGE_UNIT_OPTIONS = [
    { value: PACKAGE_UNIT.KHONG_DONG_GOI, labelKey: 'productCode.unitKhongDongGoi' },
    { value: PACKAGE_UNIT.BAO_TAI, labelKey: 'productCode.unitBaoTai' },
    { value: PACKAGE_UNIT.THUNG_CARTON, labelKey: 'productCode.unitThungCarton' },
    { value: PACKAGE_UNIT.PALLET, labelKey: 'productCode.unitPallet' }
];

export const VAT_STATUS_OPTIONS = [
    { value: VAT_STATUS.NOT_ISSUED, labelKey: 'productCode.vatChuaXuat' },
    { value: VAT_STATUS.ISSUED_NOT_PACKAGED, labelKey: 'productCode.vatDaXuatChuaDongGoi' },
    { value: VAT_STATUS.ISSUED_PACKAGED, labelKey: 'productCode.vatDaXuatDaDongGoi' }
];

export const LOADING_STATUS_OPTIONS = [
    { value: LOADING_STATUS.CHUA_XEP_XE, labelKey: 'loadingStatus.chuaXepXe' },
    { value: LOADING_STATUS.CHO_XEP_XE, labelKey: 'loadingStatus.choXepXe' },
    { value: LOADING_STATUS.DA_XEP_XE, labelKey: 'loadingStatus.daXepXe' }
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

// Export Order Status Enums
export const EXPORT_ORDER_STATUS = {
    DA_TAO_LENH: 'DA_TAO_LENH',
    DANG_XAC_NHAN_CAN: 'DANG_XAC_NHAN_CAN',
    DA_XAC_NHAN_CAN: 'DA_XAC_NHAN_CAN',
    DA_XUAT_KHO: 'DA_XUAT_KHO',
};

// Export Order Status Options (Xuất kho)
export const EXPORT_ORDER_STATUS_OPTIONS = [
    { value: 'DA_TAO_LENH', label: 'Đã tạo lệnh', color: 'blue' },
    { value: 'DANG_XAC_NHAN_CAN', label: 'Đang xác nhận cân', color: 'orange' },
    { value: 'DA_XAC_NHAN_CAN', label: 'Đã xác nhận cân', color: 'green' },
    { value: 'DA_XUAT_KHO', label: 'Đã xuất kho', color: 'purple' },
];

// Manifest Status Options (Xếp xe)
export const MANIFEST_STATUS_OPTIONS = [
    { value: 'CHO_XEP_XE', label: 'Chờ xếp xe', color: 'default' },
    { value: 'DA_XEP_XE', label: 'Đã xếp xe', color: 'blue' },
    { value: 'DANG_KIEM_HOA', label: 'Đang kiểm hóa', color: 'orange' },
    { value: 'CHO_THONG_QUAN', label: 'Chờ thông quan', color: 'gold' },
    { value: 'DA_THONG_QUAN', label: 'Đã thông quan', color: 'green' },
    { value: 'DA_NHAP_KHO_VN', label: 'Đã nhập kho VN', color: 'purple' },
];

// Inquiry Status (numeric, khớp với BE INQUIRY_STATUS)
// Số = thứ tự ưu tiên hiển thị (ORDER BY status ASC)
export const INQUIRY_STATUS = {
    PENDING_REVIEW:    1,
    PENDING_ANSWER:    2,
    PENDING_SEND:      3,
    EMAIL_SENT:        4,
    ANSWER_REJECTED:   5,
    QUESTION_REJECTED: 6,
};

export const INQUIRY_STATUS_OPTIONS = [
    { value: INQUIRY_STATUS.PENDING_REVIEW,    labelKey: 'inquiry.statusPendingReview',    color: 'orange' },
    { value: INQUIRY_STATUS.PENDING_ANSWER,    labelKey: 'inquiry.statusPendingAnswer',    color: 'blue'   },
    { value: INQUIRY_STATUS.PENDING_SEND,      labelKey: 'inquiry.statusPendingSend',      color: 'gold'   },
    { value: INQUIRY_STATUS.EMAIL_SENT,        labelKey: 'inquiry.statusEmailSent',        color: 'green'  },
    { value: INQUIRY_STATUS.ANSWER_REJECTED,   labelKey: 'inquiry.statusAnswerRejected',   color: 'red'    },
    { value: INQUIRY_STATUS.QUESTION_REJECTED, labelKey: 'inquiry.statusQuestionRejected', color: 'default'},
];

// Notification types (khớp với BE NOTIFICATION_TYPE)
export const NOTIFICATION_TYPE = {
    PRODUCT_CODE: 'PRODUCT_CODE',
    INQUIRY: 'INQUIRY',
};

