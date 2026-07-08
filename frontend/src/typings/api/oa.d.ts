declare namespace Api {
  namespace Oa {
    interface TimelineEntry {
      time: string;
      name: string;
      action: string;
      remark: string;
      images: { name: string; url: string }[];
      files: { name: string; url: string }[];
      has_restricted: boolean;
    }

    interface ApprovalDetail {
      表单名称: string;
      审批编号: string;
      审批状态: string;
      创建人: string;
      创建人部门: string;
      创建时间: string;
      instance_id: string;
      dingtalk_url: string;
      抄送人列表: string[];
      timeline: TimelineEntry[];
      [formFieldName: string]: any;
    }

    interface SyncErpParams {
      modal_data: {
        org: string;
        supplier: string;
        supplier_code?: string;
        tax_code?: string;
        doc_date: string;
        oa_code: string;
        waybill?: string;
        remark?: string;
      };
      oa_details: Record<string, any>;
    }

    interface ErpPushResult {
      code: string | number;
      message?: string;
      data?: any;
    }

    interface SearchOption {
      label: string;
      value: string;
    }
  }
}
