import { request } from '../request';

/** get product page */
export function fetchProductPage(params: Api.Product.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Product.ProductRecord>>({
    url: '/mold-product/products/page',
    method: 'get',
    params
  });
}

/** create product (returns array - one record per matching product code) */
export function fetchCreateProduct(data: Api.Product.CreateParams) {
  return request<Api.Product.ProductRecord[]>({
    url: '/mold-product/products',
    method: 'post',
    data
  });
}

/** update product */
export function fetchUpdateProduct(id: number, data: Api.Product.UpdateParams) {
  return request<Api.Product.ProductRecord>({
    url: `/mold-product/products/${id}`,
    method: 'put',
    data
  });
}

/** delete product */
export function fetchDeleteProduct(id: number) {
  return request<null>({
    url: `/mold-product/products/${id}`,
    method: 'delete'
  });
}

/** get product detail */
export function fetchGetProduct(id: number) {
  return request<Api.Product.ProductRecord>({
    url: `/mold-product/products/${id}`,
    method: 'get'
  });
}
