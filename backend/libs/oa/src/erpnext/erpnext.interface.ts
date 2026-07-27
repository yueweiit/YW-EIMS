export interface ErpNextItemPayload {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  custom_specifications: string;
  custom_external_code: string;
  custom_short_name: string;
  custom_mnemonic_code: string;
  custom_dpci: string;
  is_stock_item: number;
  is_sales_item: number;
  is_purchase_item: number;
}

/** DeepLinkERP Item GET 查询返回的物料数据 */
export interface ErpNextItemQueryResult {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  description: string | null;
}

export interface ErpNextSyncResult {
  success: boolean;
  skipped?: boolean;
  message: string;
  itemCode?: string;
  itemGroup?: string;
  status?: number;
  data?: unknown;
}
