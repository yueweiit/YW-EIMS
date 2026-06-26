<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { fetchCreateMoldCode, fetchMoldMaterialPage, fetchUpdateMoldCode } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'MoldCodeOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.MoldCode.MoldCodeRecord | null;
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
const materialOptions = ref<{ label: string; value: string }[]>([]);
const materialTypeCodeMap = ref<Map<string, string>>(new Map());

const defaultForm: Api.MoldCode.CreateParams = {
  moldType: '',
  moldName: '',
  moldPrefix: '',
  materialName: ''
};

const formModel = reactive<Api.MoldCode.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? '新增模具编码' : '编辑模具编码'));

const moldCodePreview = computed(() => {
  const prefix = formModel.moldPrefix?.trim();
  const typeCode = materialTypeCodeMap.value.get(formModel.materialName);
  if (prefix && typeCode) {
    return (prefix + typeCode).toUpperCase();
  }
  return '';
});

const rules = computed<FormRules>(() => ({
  moldType: [
    {
      required: true,
      message: '请输入模具类型',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '模具类型长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  moldName: [
    {
      required: true,
      message: '请输入模具名称',
      trigger: 'blur'
    },
    {
      max: 100,
      message: '模具名称长度不能超过100个字符',
      trigger: 'blur'
    }
  ],
  moldPrefix: [
    {
      required: true,
      message: '请输入模具前缀',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '模具前缀长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  materialName: [
    {
      required: true,
      message: '请选择材质名称',
      trigger: 'change'
    }
  ]
}));

async function loadMaterialOptions() {
  try {
    const { data, error } = await fetchMoldMaterialPage({ current: 1, size: 1000 });
    if (!error && data) {
      materialOptions.value = data.records.map(item => ({
        label: item.typeName,
        value: item.typeName
      }));
      const map = new Map<string, string>();
      data.records.forEach(item => {
        map.set(item.typeName, item.typeCode);
      });
      materialTypeCodeMap.value = map;
    }
  } catch {
    window.$message?.error('加载材质列表失败');
  }
}

function resetForm() {
  Object.assign(formModel, { ...defaultForm });
  nextTick(() => {
    restoreValidation();
  });
}

function setFormFromRow(row: Api.MoldCode.MoldCodeRecord) {
  Object.assign(formModel, {
    moldType: row.moldType,
    moldName: row.moldName,
    moldPrefix: row.moldPrefix,
    materialName: row.typeName
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    loadMaterialOptions();
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

function getSubmitBody() {
  const { moldType, moldName, moldPrefix, materialName } = formModel;
  return { moldType, moldName, moldPrefix, materialName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateMoldCode(body);
      if (!error) {
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMoldCode(props.rowData.id, body);
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
        <NFormItem label="模具类型" path="moldType">
          <NInput v-model:value="formModel.moldType" placeholder="请输入模具类型" />
        </NFormItem>

        <NFormItem label="模具名称" path="moldName">
          <NInput v-model:value="formModel.moldName" placeholder="请输入模具名称" />
        </NFormItem>

        <NFormItem label="模具前缀" path="moldPrefix">
          <NInput v-model:value="formModel.moldPrefix" placeholder="请输入模具前缀" />
        </NFormItem>

        <NFormItem label="材质名称" path="materialName">
          <NSelect
            v-model:value="formModel.materialName"
            :options="materialOptions"
            placeholder="请选择材质名称"
            filterable
          />
        </NFormItem>

        <NFormItem v-if="moldCodePreview" label="模具编码">
          <NInput :value="moldCodePreview" placeholder="自动生成" disabled />
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
