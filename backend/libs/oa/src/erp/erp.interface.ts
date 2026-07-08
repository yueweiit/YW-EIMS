export interface ErpTokenResponse {
  code: string;
  data?: {
    access_token: string;
  };
  message?: string;
}

export interface ErpPurchaseOrderPayload {
  data: {
    _status: string;
    org_code: string;
    department_code: string;
    department: string;
    vouchdate: string;
    bustype_code: string;
    vendor_code: string;
    invoiceVendor_code: string;
    currency_code: string;
    natCurrency_code: string;
    exchRate: number;
    exchRateType: string;
    exchRateType_code: string;
    bAutoGetPriceForApi: boolean;
    natMoney: number;
    natSum: number;
    oriMoney: number;
    oriSum: number;
    memo: string;
    purchaseOrderDefineCharacter: Record<string, string>;
    purchaseOrders: ErpPurchaseOrderLine[];
  };
}

export interface ErpPurchaseOrderLine {
  _status: string;
  product_cCode: string;
  qty: number;
  subQty: number;
  priceQty: number;
  oriTaxUnitPrice: number;
  oriUnitPrice: number;
  oriSum: number;
  oriMoney: number;
  oriTax: number;
  natTaxUnitPrice: number;
  natUnitPrice: number;
  natSum: number;
  natMoney: number;
  natTax: number;
  purUOM_Code: string;
  priceUOM_Code: string;
  unit_code: string;
  invExchRate: number;
  invPriceExchRate: number;
  unitExchangeTypePrice: number;
  unitExchangeType: number;
  taxitems_code: string;
  inInvoiceOrg_code: string;
  inOrg_code: string;
  demandOrg_code: string;
}

export interface ErpPushResponse {
  code: string | number;
  message?: string;
  data?: any;
}

export interface ErpListResponse<T = any> {
  code: string;
  message?: string;
  data?: {
    list?: T[];
    records?: T[];
  };
}

export interface ErpSupplierRecord {
  code?: string;
  vendorCode?: string;
  name?: string;
  vendorName?: string;
  [key: string]: any;
}

export interface ErpMaterialRecord {
  code?: string;
  productCode?: string;
  name?: string;
  productName?: string;
  specification?: string;
  modelDescription?: string;
  [key: string]: any;
}

export interface ErpUnitRecord {
  code?: string;
  unitCode?: string;
  name?: string | { zh_CN?: string };
  unitName?: string | { zh_CN?: string };
  [key: string]: any;
}

export interface ErpTaxRateRecord {
  code?: string;
  taxCode?: string;
  name?: string;
  taxName?: string;
  rateValue?: number;
  taxRate?: number;
  [key: string]: any;
}

export interface SyncErpDto {
  org: string;
  supplier: string;
  supplier_code?: string;
  tax_code?: string;
  doc_date: string;
  oa_code: string;
  waybill?: string;
  remark?: string;
}
