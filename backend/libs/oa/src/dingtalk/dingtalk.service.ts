import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  DingTalkTokenResponse,
  DingTalkInstanceListResponse,
  DingTalkInstanceDetailResponse,
  DingTalkProcessInstance,
  DingTalkFileUrlResponse,
} from './dingtalk.interface';

@Injectable()
export class DingTalkService {
  private readonly logger = new Logger(DingTalkService.name);

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
    this.appKey = this.configService.get<string>('DINGTALK_APP_KEY', '');
    this.appSecret = this.configService.get<string>('DINGTALK_APP_SECRET', '');
  }

  async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.tokenCache.token && now < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    try {
      const url = `https://oapi.dingtalk.com/gettoken?appkey=${this.appKey}&appsecret=${this.appSecret}`;
      const { data } = await firstValueFrom(this.httpService.get<DingTalkTokenResponse>(url));

      if (data.errcode === 0) {
        this.tokenCache = {
          token: data.access_token,
          expiresAt: now + 7000 * 1000,
        };
        return data.access_token;
      }

      this.logger.error(`Failed to get DingTalk token: ${data.errmsg}`);
      return null;
    } catch (error) {
      this.logger.error(`DingTalk token request failed: ${error.message}`);
      return null;
    }
  }

  async getInstanceIds(
    processCode: string,
    startTime: number,
    endTime: number,
  ): Promise<string[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const url = `https://oapi.dingtalk.com/topapi/processinstance/listids?access_token=${token}`;
    const allIds: string[] = [];
    let cursor = 0;

    while (true) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.post<DingTalkInstanceListResponse>(url, {
            process_code: processCode,
            start_time: startTime,
            end_time: endTime,
            size: 20,
            cursor,
          }),
        );

        if (data.errcode !== 0) break;

        const ids = data.result?.list || [];
        allIds.push(...ids);

        const nextCursor = data.result?.next_cursor;
        if (!nextCursor) break;
        cursor = nextCursor;
      } catch {
        break;
      }
    }

    return allIds;
  }

  async getInstanceDetail(instanceId: string): Promise<DingTalkProcessInstance | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const url = `https://oapi.dingtalk.com/topapi/processinstance/get?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DingTalkInstanceDetailResponse>(url, {
          process_instance_id: instanceId,
        }),
      );

      if (data.errcode === 0) {
        return data.process_instance;
      }

      this.logger.error(`Failed to get instance detail: ${data.errmsg}`);
      return null;
    } catch (error) {
      this.logger.error(`Instance detail request failed: ${error.message}`);
      return null;
    }
  }

  async getFileDownloadUrl(fileId: string, instanceId: string): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const url = `https://oapi.dingtalk.com/topapi/processinstance/file/url/get?access_token=${token}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DingTalkFileUrlResponse>(url, {
          request: {
            process_instance_id: instanceId,
            file_id: fileId,
          },
        }),
      );

      if (data.errcode === 0) {
        return data.result?.download_uri || null;
      }

      return null;
    } catch {
      return null;
    }
  }
}
