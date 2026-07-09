<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NSelect, NSpace } from 'naive-ui';
import { fetchCreateMold, fetchMoldCodePage, fetchPhoneModelPage, fetchUpdateMold } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'MoldOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Mold.MoldRecord | null;
}

const props = withDefaults(defineProps<Props>(), {
  rowData: null
});

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const loading = ref(false);
const moldCodeOptions = ref<{ label: string; value: string }[]>([]);
const phoneNameOptions = ref<{ label: string; value: string }[]>([]);
const phoneNameLoading = ref(false);
const phoneNamePage = ref(1);
const phoneNameTotal = ref(0);
const phoneNameSearchText = ref('');

const defaultForm: Api.Mold.CreateParams = {
  moldCode: '',
  phoneName: ''
};

const formModel = reactive<Api.Mold.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? '新增模具' : '编辑模具'));

const rules = computed<FormRules>(() => ({
  moldCode: [
    {
      required: true,
      message: '请选择模具编码',
      trigger: 'change'
    }
  ],
  phoneName: [
    {
      required: true,
      message: '请选择手机名称',
      trigger: 'change'
    }
  ]
}));

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    restoreValidation();
  });
}

function setFormFromRow(row: Api.Mold.MoldRecord) {
  Object.assign(formModel, {
    moldCode: row.moldCode,
    phoneName: row.phoneName
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    loadMoldCodeOptions();
    loadPhoneNameOptions();
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

async function loadMoldCodeOptions() {
  try {
    const { data, error } = await fetchMoldCodePage({ current: 1, size: 100 });
    if (!error && data) {
      moldCodeOptions.value = data.records.map(item => ({
        label: `${item.moldCode} - ${item.moldName}`,
        value: item.moldCode
      }));
    }
  } catch {
    window.$message?.error('加载模具编码列表失败');
  }
}

async function loadPhoneNameOptions(searchText = '', reset = true) {
  if (reset) {
    phoneNamePage.value = 1;
    phoneNameOptions.value = [];
  }
  phoneNameSearchText.value = searchText;
  phoneNameLoading.value = true;
  try {
    const { data, error } = await fetchPhoneModelPage({
      current: phoneNamePage.value,
      size: 5,
      phoneName: searchText || undefined
    });
    if (!error && data) {
      const newOptions = data.records.map(item => ({
        label: item.phoneName,
        value: item.phoneName
      }));
      if (reset) {
        phoneNameOptions.value = newOptions;
      } else {
        phoneNameOptions.value = [...phoneNameOptions.value, ...newOptions];
      }
      phoneNameTotal.value = data.total;
    }
  } catch {
    window.$message?.error('加载手机型号列表失败');
  } finally {
    phoneNameLoading.value = false;
  }
}

function handlePhoneNameSearch(query: string) {
  loadPhoneNameOptions(query, true);
}

function handlePhoneNameScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 20) {
    if (phoneNameOptions.value.length < phoneNameTotal.value) {
      phoneNamePage.value++;
      loadPhoneNameOptions(phoneNameSearchText.value, false);
    }
  }
}

function getSubmitBody() {
  const { moldCode, phoneName } = formModel;
  return { moldCode, phoneName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateMold(body);
      if (!error) {
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMold(props.rowData.id, body);
      if (!error) {
        window.$message?.success('更新成功');
        visible.value = false;
        emit('submitted');
      }
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" width="420px" placement="right">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="90px">
        <NFormItem label="模具编码" path="moldCode">
          <NSelect
            v-model:value="formModel.moldCode"
            :options="moldCodeOptions"
            placeholder="请选择模具编码"
            filterable
          />
        </NFormItem>

        <NFormItem label="手机名称" path="phoneName">
          <NSelect
            v-model:value="formModel.phoneName"
            :options="phoneNameOptions"
            placeholder="请选择手机名称"
            filterable
            remote
            :loading="phoneNameLoading"
            :clearable="true"
            @search="handlePhoneNameSearch"
            @scroll="handlePhoneNameScroll"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            确定
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
