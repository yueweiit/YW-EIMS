import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { DingTalkProcessInstance } from './dingtalk.interface';

interface DingTalkAppAccessTokenResponse {
  accessToken?: string;
  expireIn?: number;
  code?: string;
  message?: string;
}

interface DingTalkInstanceIdsResponse {
  success?: boolean;
  result?: {
    list?: string[];
    nextToken?: number | string;
  };
}

interface DingTalkWorkflowInstanceResponse {
  success?: boolean;
  result?: {
    title?: string;
    status?: string;
    businessId?: string;
    originatorUserId?: string;
    originatorDeptId?: string;
    createTime?: string;
    finishTime?: string;
    url?: string;
    ccUserIds?: string[];
    operationRecords?: Array<{
      userId?: string;
      type?: string;
      result?: string;
      remark?: string;
      date?: string;
      attachments?: unknown[];
      images?: string[];
    }>;
    formComponentValues?: Array<{
      name?: string;
      value?: string;
      extValue?: string;
    }>;
    tasks?: Array<{
      userId?: string;
      status?: string;
      result?: string;
    }>;
  };
}

interface DingTalkFileUrlResponseV1 {
  success?: boolean;
  result?: {
    downloadUri?: string;
  };
}

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
      const { data } = await firstValueFrom(
        this.httpService.post<DingTalkAppAccessTokenResponse>(
          'https://api.dingtalk.com/v1.0/oauth2/accessToken',
          {
            appKey: this.appKey,
            appSecret: this.appSecret,
          },
        ),
      );

      if (data.accessToken) {
        const cacheSeconds = Math.max((data.expireIn ?? 7200) - 300, 60);
        this.tokenCache = {
          token: data.accessToken,
          expiresAt: now + cacheSeconds * 1000,
        };
        return data.accessToken;
      }

      this.logger.error(
        `Failed to get DingTalk token: ${data.message || data.code || 'unknown error'}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `DingTalk token request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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

    const url = 'https://api.dingtalk.com/v1.0/workflow/processes/instanceIds/query';
    const allIds: string[] = [];
    let nextToken: number | string = 0;

    while (true) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.post<DingTalkInstanceIdsResponse>(
            url,
            {
              processCode,
              startTime,
              endTime,
              maxResults: 20,
              nextToken,
            },
            { headers: this.getTokenHeaders(token) },
          ),
        );

        if (data.success === false || !data.result) break;

        const ids = data.result.list || [];
        allIds.push(...ids);

        const returnedNextToken = data.result.nextToken;
        if (
          returnedNextToken === undefined ||
          returnedNextToken === null ||
          String(returnedNextToken) === '0' ||
          String(returnedNextToken) === String(nextToken)
        ) {
          break;
        }
        nextToken = returnedNextToken;
      } catch {
        break;
      }
    }

    return allIds;
  }

  async getInstanceDetail(instanceId: string): Promise<DingTalkProcessInstance | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<DingTalkWorkflowInstanceResponse>(
          'https://api.dingtalk.com/v1.0/workflow/processInstances',
          {
            params: { processInstanceId: instanceId },
            headers: this.getTokenHeaders(token),
          },
        ),
      );

      if (data.success === false || !data.result) {
        this.logger.error('Failed to get DingTalk instance detail');
        return null;
      }

      return this.mapInstanceDetail(data.result);
    } catch (error) {
      this.logger.error(
        `Instance detail request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getFileDownloadUrl(fileId: string, instanceId: string): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DingTalkFileUrlResponseV1>(
          'https://api.dingtalk.com/v1.0/workflow/processInstances/spaces/files/urls/download',
          {
            processInstanceId: instanceId,
            fileId,
          },
          { headers: this.getTokenHeaders(token) },
        ),
      );

      return data.success === false ? null : data.result?.downloadUri || null;
    } catch {
      return null;
    }
  }

  private getTokenHeaders(token: string) {
    return {
      'x-acs-dingtalk-access-token': token,
      'Cache-Control': 'no-store',
    };
  }

  private mapInstanceDetail(
    detail: NonNullable<DingTalkWorkflowInstanceResponse['result']>,
  ): DingTalkProcessInstance {
    return {
      title: detail.title || '',
      status: detail.status || '',
      business_id: detail.businessId || '',
      originator_userid: detail.originatorUserId || '',
      originator_dept_id: detail.originatorDeptId || '',
      create_time: detail.createTime || detail.finishTime || '',
      url: detail.url || '',
      cc_userids: detail.ccUserIds || [],
      operation_records: (detail.operationRecords || []).map(record => ({
        userid: record.userId || '',
        operation_type: record.type || '',
        operation_result: record.result,
        remark: record.remark,
        date: record.date || '',
        attachments: this.mapAttachments(record.attachments),
        images: record.images,
      })),
      form_component_values: (detail.formComponentValues || []).map(item => ({
        name: item.name || '',
        value: item.value || '',
        ext: item.extValue,
      })),
      tasks: (detail.tasks || []).map(task => ({
        userid: task.userId || '',
        task_status: task.status || '',
        task_result: task.result,
      })),
    };
  }

  private mapAttachments(attachments?: unknown[]) {
    if (!attachments) return [];
    return attachments.map(attachment => {
      if (typeof attachment !== 'object' || attachment === null) return {};
      const record = attachment as Record<string, unknown>;
      return {
        url: this.getString(record.url),
        file_url: this.getString(record.fileUrl),
        download_url: this.getString(record.downloadUrl),
        file_name: this.getString(record.fileName),
        fileName: this.getString(record.fileName),
      };
    });
  }

  private getString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }
}
