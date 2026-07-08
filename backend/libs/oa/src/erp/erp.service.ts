import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import type {
  ErpTokenResponse,
  ErpPurchaseOrderPayload,
  ErpPushResponse,
  ErpListResponse,
  ErpSupplierRecord,
  ErpMaterialRecord,
  ErpUnitRecord,
  ErpTaxRateRecord,
} from './erp.interface';

@Injectable()
export class ErpService {
  private readonly logger = new Logger(ErpService.name);

  private tokenCache: { token: string | null; expiresAt: number } = {
    token: null,
    expiresAt: 0,
  };

  private readonly appKey: string;
  private readonly appSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.appKey = this.configService.get<string>('ERP_APP_KEY', '');
    this.appSecret = this.configService.get<string>('ERP_APP_SECRET', '');
  }

  async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.tokenCache.token && now < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const timestamp = Date.now().toString();
    const waitEncryptStr = `appKey${this.appKey}timestamp${timestamp}`;

    const sign = crypto
      .createHmac('sha256', this.appSecret)
      .update(waitEncryptStr)
      .digest('base64');

    const url = `https://c4.yonyoucloud.com/iuap-api-auth/open-auth/selfAppAuth/getAccessToken?appKey=${this.appKey}&timestamp=${timestamp}&signature=${encodeURIComponent(sign)}`;

    try {
      const { data } = await firstValueFrom(this.httpService.get<ErpTokenResponse>(url));

      if (data.code === '00000' && data.data?.access_token) {
        this.tokenCache = {
          token: data.data.access_token,
          expiresAt: now + 7000 * 1000,
        };
        return data.data.access_token;
      }

      this.logger.error(`Failed to get ERP token: ${data.message}`);
      return null;
    } catch (error) {
      this.logger.error(`ERP token request failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async pushPurchaseOrder(payload: ErpPurchaseOrderPayload): Promise<ErpPushResponse> {
    const token = await this.getAccessToken();
    if (!token) {
      return { code: 'error', message: '获取 ERP Token 失败，请检查秘钥。' };
    }

    const url = `https://c4.yonyoucloud.com/iuap-api-gateway/yonbip/scm/purchaseorder/singleSave_v1?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ErpPushResponse>(url, payload),
      );

      if (String(data.code) === '200') {
        return { code: 'success', data: data.data };
      }

      let friendlyMessage = data.message || 'ERP 拒绝了请求';
      try {
        if (friendlyMessage.trim().startsWith('[')) {
          const errList = JSON.parse(friendlyMessage);
          const extractedMsgs = errList
            .filter((err: any) => err.message)
            .map((err: any) => err.message);
          if (extractedMsgs.length > 0) {
            friendlyMessage = extractedMsgs.join('；\n');
          }
        }
      } catch {
        // keep original message
      }

      return { code: 'error', message: friendlyMessage, data };
    } catch (error) {
      return { code: 'error', message: `网络异常: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async fetchSuppliers(pageIndex: number, pageSize: number = 200): Promise<ErpSupplierRecord[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = `https://c4.yonyoucloud.com/iuap-api-gateway/yonbip/digitalModel/vendor/listV3?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ErpListResponse<ErpSupplierRecord>>(url, { pageIndex, pageSize }),
      );

      if (data.code === '00000' || String(data.code) === '200') {
        return data.data?.list || data.data?.records || [];
      }

      this.logger.error(`Fetch suppliers failed: ${data.message}`);
      return [];
    } catch (error) {
      this.logger.error(`Fetch suppliers request failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async fetchMaterials(pageIndex: number, pageSize: number = 200): Promise<ErpMaterialRecord[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = `https://c4.yonyoucloud.com/iuap-api-gateway/yonbip/digitalModel/product/listproductbycondition?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ErpListResponse<ErpMaterialRecord>>(url, { pageIndex, pageSize }),
      );

      if (data.code === '00000' || String(data.code) === '200') {
        return data.data?.list || data.data?.records || [];
      }

      this.logger.error(`Fetch materials failed: ${data.message}`);
      return [];
    } catch (error) {
      this.logger.error(`Fetch materials request failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async fetchUnits(pageIndex: number, pageSize: number = 100): Promise<ErpUnitRecord[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = `https://c4.yonyoucloud.com/iuap-api-gateway/yonbip/digitalModel/unit/newlist?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ErpListResponse<ErpUnitRecord>>(url, { pageIndex, pageSize }),
      );

      if (data.code === '00000' || String(data.code) === '200') {
        return data.data?.list || data.data?.records || [];
      }

      this.logger.error(`Fetch units failed: ${data.message}`);
      return [];
    } catch (error) {
      this.logger.error(`Fetch units request failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async fetchTaxRates(pageIndex: number, pageSize: number = 100): Promise<ErpTaxRateRecord[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = `https://c4.yonyoucloud.com/iuap-api-gateway/yonbip/tax/yonbip-fi-taxpubdoc/openapi/taxRate/findListWithPage?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ErpListResponse<ErpTaxRateRecord>>(url, { pageIndex, pageSize }),
      );

      if (data.code === '00000' || String(data.code) === '200') {
        return data.data?.list || data.data?.records || [];
      }

      this.logger.error(`Fetch tax rates failed: ${data.message}`);
      return [];
    } catch (error) {
      this.logger.error(`Fetch tax rates request failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
