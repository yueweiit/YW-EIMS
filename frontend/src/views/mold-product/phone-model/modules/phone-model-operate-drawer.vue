<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreatePhoneModel, fetchUpdatePhoneModel } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'PhoneModelOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.PhoneModel.PhoneModelRecord | null;
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

const defaultForm: Api.PhoneModel.CreateParams = {
  phoneName: '',
  phoneShortName: ''
};

const formModel = reactive<Api.PhoneModel.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? '新增手机型号' : '编辑手机型号'));

const rules = computed<FormRules>(() => ({
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
  ],
  phoneShortName: [
    {
      max: 50,
      message: '手机简称长度不能超过50个字符',
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

function setFormFromRow(row: Api.PhoneModel.PhoneModelRecord) {
  Object.assign(formModel, {
    phoneName: row.phoneName,
    phoneShortName: row.phoneShortName || ''
  });
  nextTick(() => {
    restoreValidation();
  });
}

watch(visible, val => {
  if (val) {
    if (props.type === 'edit' && props.rowData) {
      setFormFromRow(props.rowData);
    } else {
      resetForm();
    }
  }
});

function getSubmitBody() {
  const { phoneName, phoneShortName } = formModel;
  return { phoneName, phoneShortName };
}

async function handleSubmit() {
  loading.value = true;
  try {
    await validate();
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreatePhoneModel(body);
      if (!error) {
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdatePhoneModel(props.rowData.id, body);
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
        <NFormItem label="手机名称" path="phoneName">
          <NInput v-model:value="formModel.phoneName" placeholder="请输入手机名称" />
        </NFormItem>

        <NFormItem label="手机简称" path="phoneShortName">
          <NInput v-model:value="formModel.phoneShortName" placeholder="请输入手机简称" />
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
