import { request } from '../request';

/** get product code page */
export function fetchProductCodePage(params: Api.ProductCode.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.ProductCode.ProductCodeRecord>>({
    url: '/mold-product/product-codes/page',
    method: 'get',
    params
  });
}

/** create product code */
export function fetchCreateProductCode(data: Api.ProductCode.CreateParams) {
  return request<Api.ProductCode.ProductCodeRecord>({
    url: '/mold-product/product-codes',
    method: 'post',
    data
  });
}

/** update product code */
export function fetchUpdateProductCode(id: number, data: Api.ProductCode.UpdateParams) {
  return request<Api.ProductCode.ProductCodeRecord>({
    url: `/mold-product/product-codes/${id}`,
    method: 'put',
    data
  });
}

/** delete product code */
export function fetchDeleteProductCode(id: number) {
  return request<null>({
    url: `/mold-product/product-codes/${id}`,
    method: 'delete'
  });
}

/** get product code detail */
export function fetchGetProductCode(id: number) {
  return request<Api.ProductCode.ProductCodeRecord>({
    url: `/mold-product/product-codes/${id}`,
    method: 'get'
  });
}
