<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchCreateColor, fetchUpdateColor } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'ColorOperateDrawer'
});

interface Props {
  type: NaiveUI.TableOperateType;
  rowData?: Api.Color.ColorRecord | null;
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

const defaultForm: Api.Color.CreateParams = {
  colorCode: '',
  colorName: ''
};

const formModel = reactive<Api.Color.CreateParams>({ ...defaultForm });

const title = computed(() => (props.type === 'add' ? '新增颜色' : '编辑颜色'));

const rules = computed<FormRules>(() => ({
  colorCode: [
    {
      required: true,
      message: '请输入颜色编码',
      trigger: 'blur'
    },
    {
      max: 50,
      message: '颜色编码长度不能超过50个字符',
      trigger: 'blur'
    }
  ],
  colorName: [
    {
      required: true,
      message: '请输入颜色名称',
      trigger: 'blur'
    },
    {
      max: 100,
      message: '颜色名称长度不能超过100个字符',
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

function setFormFromRow(row: Api.Color.ColorRecord) {
  Object.assign(formModel, {
    colorCode: row.colorCode,
    colorName: row.colorName
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
  const { colorCode, colorName } = formModel;
  return { colorCode, colorName };
}

async function handleSubmit() {
  await validate();

  loading.value = true;
  try {
    const body = getSubmitBody();
    if (props.type === 'add') {
      const { error } = await fetchCreateColor(body);
      if (!error) {
        window.$message?.success('新增成功');
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateColor(props.rowData.id, body);
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
        <NFormItem label="颜色编码" path="colorCode">
          <NInput v-model:value="formModel.colorCode" placeholder="请输入颜色编码" />
        </NFormItem>

        <NFormItem label="颜色名称" path="colorName">
          <NInput v-model:value="formModel.colorName" placeholder="请输入颜色名称" />
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
