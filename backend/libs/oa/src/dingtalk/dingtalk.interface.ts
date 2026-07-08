export interface DingTalkTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
}

export interface DingTalkInstanceListResponse {
  errcode: number;
  errmsg: string;
  result: {
    list: string[];
    next_cursor?: number;
  };
}

export interface DingTalkInstanceDetailResponse {
  errcode: number;
  errmsg: string;
  process_instance: DingTalkProcessInstance;
}

export interface DingTalkProcessInstance {
  title: string;
  status: string;
  business_id: string;
  originator_userid: string;
  originator_dept_id: string;
  create_time: string;
  url: string;
  cc_userids: string[];
  operation_records: DingTalkOperationRecord[];
  form_component_values: DingTalkFormComponent[];
  tasks?: DingTalkTask[];
}

export interface DingTalkOperationRecord {
  userid: string;
  operation_type: string;
  operation_result?: string;
  remark?: string;
  date: string;
  attachments?: DingTalkAttachment[] | string;
  images?: string[];
}

export interface DingTalkFormComponent {
  name: string;
  value: string;
  ext?: string;
}

export interface DingTalkAttachment {
  url?: string;
  file_url?: string;
  download_url?: string;
  file_name?: string;
  fileName?: string;
}

export interface DingTalkTask {
  userid: string;
  task_status: string;
  task_result?: string;
}

export interface DingTalkFileUrlResponse {
  errcode: number;
  result?: {
    download_uri: string;
  };
}

export interface ParsedApprovalDetail {
  [key: string]: any;
  '表单名称': string;
  '审批编号': string;
  '审批状态': string;
  '创建人': string;
  '创建人部门': string;
  '创建时间': string;
  'instance_id': string;
  'dingtalk_url': string;
  '抄送人列表': string[];
  'timeline': TimelineEntry[];
}

export interface TimelineEntry {
  time: string;
  name: string;
  action: string;
  remark: string;
  images: { name: string; url: string }[];
  files: { name: string; url: string }[];
  has_restricted: boolean;
}
