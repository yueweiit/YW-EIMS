<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NSelect, NSpace } from 'naive-ui';
import { fetchCreateMold, fetchMoldCodePage, fetchPhoneModelPage, fetchUpdateMold } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

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

const title = computed(() => (props.type === 'add' ? $t('page.ui.addMold') : $t('page.ui.editMold')));

const rules = computed<FormRules>(() => ({
  moldCode: [
    {
      required: true,
      message: $t('page.ui.selectMoldCode'),
      trigger: 'change'
    }
  ],
  phoneName: [
    {
      required: true,
      message: $t('page.ui.selectPhoneName'),
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
    window.$message?.error($t('page.ui.loadMoldCodeListFailed'));
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
    window.$message?.error($t('page.ui.loadPhoneModelListFailed'));
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
        window.$message?.success($t('common.addSuccess'));
        visible.value = false;
        emit('submitted');
      }
    } else if (props.rowData) {
      const { error } = await fetchUpdateMold(props.rowData.id, body);
      if (!error) {
        window.$message?.success($t('common.updateSuccess'));
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
        <NFormItem :label="$t('page.ui.moldCode')" path="moldCode">
          <NSelect
            v-model:value="formModel.moldCode"
            :options="moldCodeOptions"
            :placeholder="$t('page.ui.selectMoldCode')"
            filterable
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.phoneName')" path="phoneName">
          <NSelect
            v-model:value="formModel.phoneName"
            :options="phoneNameOptions"
            :placeholder="$t('page.ui.selectPhoneName')"
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
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
