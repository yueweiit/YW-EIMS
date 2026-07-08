<script setup lang="ts">
import { ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchApprovalDetail } from '@/service/api';
import { $t } from '@/locales';
import ErpSyncDrawer from './modules/erp-sync-drawer.vue';

defineOptions({ name: 'OaApproval' });

const { loading, startLoading, endLoading } = useLoading(false);

const oaCode = ref('');
const detail = ref<Api.Oa.ApprovalDetail | null>(null);
const searched = ref(false);

// ERP sync drawer
const syncDrawerVisible = ref(false);

const knownKeys = new Set([
  '表单名称', '审批编号', '审批状态', '创建人', '创建人部门', '创建时间',
  'instance_id', 'dingtalk_url', '抄送人列表', 'timeline'
]);

const basicFields = [
  { key: '表单名称', label: 'page.oa.approval.formName' },
  { key: '审批编号', label: 'page.oa.approval.approvalCode' },
  { key: '审批状态', label: 'page.oa.approval.approvalStatus' },
  { key: '创建人', label: 'page.oa.approval.creator' },
  { key: '创建人部门', label: 'page.oa.approval.creatorDept' },
  { key: '创建时间', label: 'page.oa.approval.createTime' }
];

const dynamicFields = ref<{ key: string; value: string }[]>([]);

const statusTagType = (status: string) => {
  if (status === 'COMPLETED') return 'success';
  if (status === 'RUNNING') return 'info';
  if (status === 'TERMINATED') return 'error';
  return 'default';
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    COMPLETED: '已完成',
    RUNNING: '进行中',
    TERMINATED: '已终止',
    CANCELED: '已取消'
  };
  return map[status] || status;
};

async function handleSearch() {
  const code = oaCode.value.trim();
  if (!code) return;

  startLoading();
  searched.value = true;
  detail.value = null;
  dynamicFields.value = [];

  try {
    const { data, error } = await fetchApprovalDetail({ oa_code: code });
    if (!error && data) {
      detail.value = data;
      // Extract dynamic form fields
      const fields: { key: string; value: string }[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (!knownKeys.has(key) && typeof value === 'string' && value.trim()) {
          fields.push({ key, value });
        }
      }
      dynamicFields.value = fields;
    }
  } finally {
    endLoading();
  }
}

function handlePushToErp() {
  syncDrawerVisible.value = true;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch();
  }
}
</script>

<template>
  <NSpace vertical :size="16">
    <!-- Search -->
    <NCard :bordered="false">
      <NSpace align="center" :size="12">
        <NInput
          v-model:value="oaCode"
          :placeholder="$t('page.oa.approval.searchPlaceholder')"
          clearable
          style="width: 360px"
          @keydown="handleKeydown"
        />
        <NButton type="primary" :loading="loading" @click="handleSearch">
          {{ $t('page.oa.approval.search') }}
        </NButton>
        <NButton v-if="detail" type="primary" @click="handlePushToErp">
          {{ $t('page.oa.approval.pushToErp') }}
        </NButton>
      </NSpace>
    </NCard>

    <!-- No result -->
    <NCard v-if="searched && !loading && !detail" :bordered="false">
      <NEmpty :description="$t('page.oa.approval.noResult')" />
    </NCard>

    <!-- Detail -->
    <template v-if="detail">
      <!-- Basic info -->
      <NCard :title="$t('page.oa.approval.basicInfo')" :bordered="false">
        <NDescriptions :column="2" label-placement="left" bordered>
          <NDescriptionsItem v-for="field in basicFields" :key="field.key" :label="$t(field.label)">
            <template v-if="field.key === '审批状态'">
              <NTag :type="statusTagType(detail['审批状态'])" size="small">
                {{ statusLabel(detail['审批状态']) }}
              </NTag>
            </template>
            <template v-else-if="field.key === '创建时间'">
              {{ detail['创建时间'] || '-' }}
            </template>
            <template v-else>
              {{ detail[field.key] || '-' }}
            </template>
          </NDescriptionsItem>
        </NDescriptions>

        <div v-if="detail['抄送人列表']?.length" class="mt-12px">
          <span class="text-14px font-medium mr-8px">{{ $t('page.oa.approval.ccList') }}:</span>
          <NSpace :size="4" inline>
            <NTag v-for="person in detail['抄送人列表']" :key="person" size="small" type="info">
              {{ person }}
            </NTag>
          </NSpace>
        </div>

        <div v-if="detail['dingtalk_url']" class="mt-12px">
          <NButton text tag="a" :href="detail['dingtalk_url']" target="_blank" type="primary">
            {{ $t('page.oa.approval.viewInDingtalk') }}
          </NButton>
        </div>
      </NCard>

      <!-- Dynamic form fields -->
      <NCard v-if="dynamicFields.length" :title="$t('page.oa.approval.formFields')" :bordered="false">
        <NDescriptions :column="2" label-placement="left" bordered>
          <NDescriptionsItem v-for="field in dynamicFields" :key="field.key" :label="field.key">
            {{ field.value }}
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <!-- Timeline -->
      <NCard v-if="detail.timeline?.length" :title="$t('page.oa.approval.timeline')" :bordered="false">
        <NTimeline>
          <NTimelineItem
            v-for="(entry, index) in detail.timeline"
            :key="index"
            :type="entry.action.includes('同意') ? 'success' : entry.action.includes('拒绝') ? 'error' : 'info'"
            :title="`${entry.name} ${entry.action}`"
            :content="entry.remark"
            :time="entry.time"
          />
        </NTimeline>
      </NCard>

    </template>

    <!-- ERP Sync Drawer -->
    <ErpSyncDrawer
      v-model:visible="syncDrawerVisible"
      :oa-code="oaCode"
      :oa-details="detail"
    />
  </NSpace>
</template>
