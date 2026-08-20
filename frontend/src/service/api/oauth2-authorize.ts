import { request } from "../request";
import type {
  OAuth2AuthorizeConfirmParams,
  OAuth2AuthorizeConfirmResult,
} from "./oauth2-binding";

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
