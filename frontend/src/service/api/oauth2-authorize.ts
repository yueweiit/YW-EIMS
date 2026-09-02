import { request } from "../request";
import type {
  OAuth2AuthorizeConfirmParams,
  OAuth2AuthorizeConfirmResult,
  OAuth2AuthorizeRequest,
} from "./oauth2-binding";

/** Get server-side OAuth2 consent metadata. */
export function fetchOAuth2AuthorizeRequest(transactionId: string) {
  return request<OAuth2AuthorizeRequest>({
    url: "/oauth/authorize/transaction",
    method: "get",
    params: { transaction_id: transactionId },
  });
}

/** Confirm OAuth2 consent with the logged-in EIMS browser session. */
export function fetchOAuth2AuthorizeConfirm(
  data: OAuth2AuthorizeConfirmParams,
) {
  return request<OAuth2AuthorizeConfirmResult>({
    url: "/oauth/authorize/confirm",
    method: "post",
    data,
  });
}
