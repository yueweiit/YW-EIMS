import { request } from '../request';

/** get code rule page */
export function fetchCodeRulePage(params: Api.CodeRule.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.CodeRule.CodeRuleRecord>>({
    url: '/material-code-rule/page',
    method: 'get',
    params
  });
}

/** create code rule */
export function fetchCreateCodeRule(data: Api.CodeRule.CreateParams) {
  return request<Api.CodeRule.CodeRuleRecord>({
    url: '/material-code-rule',
    method: 'post',
    data
  });
}

/** update code rule */
export function fetchUpdateCodeRule(codePrefix: string, data: Api.CodeRule.UpdateParams) {
  return request<Api.CodeRule.CodeRuleRecord>({
    url: `/material-code-rule/${codePrefix}`,
    method: 'put',
    data
  });
}

/** delete code rule */
export function fetchDeleteCodeRule(codePrefix: string) {
  return request<null>({
    url: `/material-code-rule/${codePrefix}`,
    method: 'delete'
  });
}

/** get code rule detail */
export function fetchGetCodeRule(codePrefix: string) {
  return request<Api.CodeRule.CodeRuleRecord>({
    url: `/material-code-rule/${codePrefix}`,
    method: 'get'
  });
}
