<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { fetchCreateMold, fetchMoldCodePage, fetchUpdateMold } from '@/service/api';
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
      message: '请输入手机名称',
      trigger: 'blur'
    },
    {
      max: 100,
      message: '手机名称长度不能超过100个字符',
      trigger: 'blur'
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
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

async function loadMoldCodeOptions() {
  const { data, error } = await fetchMoldCodePage({ current: 1, size: 1000 });
  if (!error && data) {
    moldCodeOptions.value = data.records.map(item => ({
      label: `${item.moldCode} - ${item.moldName}`,
      value: item.moldCode
    }));
  }
}

function getSubmitBody() {
  const { moldCode, phoneName } = formModel;
  return { moldCode, phoneName };
}

async function handleSubmit() {
  await validate();

  loading.value = true;
  try {
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
          <NInput v-model:value="formModel.phoneName" placeholder="请输入手机名称" />
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
