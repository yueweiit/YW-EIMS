<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useLoading } from "@sa/hooks";
import {
  fetchCreateOAuth2Client,
  fetchUpdateOAuth2Client,
} from "@/service/api";
import type {
  OAuth2ClientRecord,
  CreateOAuth2ClientParams,
  UpdateOAuth2ClientParams,
} from "@/service/api/oauth2-client";
import { $t } from '@/locales';

defineOptions({
  name: "OAuth2ClientOperateDrawer",
});

interface Props {
  visible: boolean;
  type: NaiveUI.TableOperateType;
  rowData: OAuth2ClientRecord | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "submitted"): void;
  (
    e: "secret-created",
    value: { clientId: string; clientSecret: string },
  ): void;
}>();

const { loading, startLoading, endLoading } = useLoading(false);

const defaultForm: CreateOAuth2ClientParams = {
  name: "",
  description: "",
  redirectUris: [""],
  scopes: ["openid", "profile", "email"],
  status: "1",
};

const form = ref<CreateOAuth2ClientParams>({ ...defaultForm });
const newRedirectUri = ref("");

const drawerTitle = computed(() =>
  props.type === "add" ? $t('page.ui.newOauthClient') : $t('page.ui.editOauthClient'),
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.type === "edit" && props.rowData) {
        form.value = {
          name: props.rowData.name,
          description: props.rowData.description || "",
          redirectUris: [...props.rowData.redirectUris],
          scopes: [...props.rowData.scopes],
          status: props.rowData.status,
        };
      } else {
        form.value = { ...defaultForm, redirectUris: [""] };
      }
      newRedirectUri.value = "";
    }
  },
);

function handleClose() {
  emit("update:visible", false);
}

function addRedirectUri() {
  form.value.redirectUris.push("");
}

function removeRedirectUri(index: number) {
  if (form.value.redirectUris.length > 1) {
    form.value.redirectUris.splice(index, 1);
  }
}

async function handleSubmit() {
  // Validate
  if (!form.value.name?.trim()) {
    window.$message?.error($t('page.ui.enterAppName'));
    return;
  }

  const validUris = form.value.redirectUris.filter((uri) => uri.trim());
  if (validUris.length === 0) {
    window.$message?.error($t('page.ui.enterRedirectUri'));
    return;
  }

  startLoading();
  try {
    const submitData = {
      ...form.value,
      redirectUris: validUris,
    };

    if (props.type === "add") {
      const { data, error } = await fetchCreateOAuth2Client(submitData);
      if (!error) {
        if (data?.clientId && data.clientSecret) {
          emit("secret-created", {
            clientId: data.clientId,
            clientSecret: data.clientSecret,
          });
        }
        window.$message?.success($t('page.ui.created'));
        handleClose();
        emit("submitted");
      }
    } else if (props.rowData) {
      const updateData: UpdateOAuth2ClientParams = {
        name: submitData.name,
        description: submitData.description,
        redirectUris: submitData.redirectUris,
        scopes: submitData.scopes,
        status: submitData.status,
      };
      const { error } = await fetchUpdateOAuth2Client(
        props.rowData.id,
        updateData,
      );
      if (!error) {
        window.$message?.success($t('page.ui.updated'));
        handleClose();
        emit("submitted");
      }
    }
  } finally {
    endLoading();
  }
}

const scopeOptions = computed(() => [
  { label: $t('page.ui.oauthOpenid'), value: 'openid' },
  { label: $t('page.ui.oauthProfile'), value: 'profile' },
  { label: $t('page.ui.oauthEmail'), value: 'email' }
]);
</script>

<template>
  <NDrawer :show="visible" :width="500" @update:show="handleClose">
    <NDrawerContent :title="drawerTitle" closable>
      <NForm label-placement="left" label-width="100">
        <NFormItem :label="$t('page.ui.appName')" required>
          <NInput v-model:value="form.name" :placeholder="$t('page.ui.appNamePlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('page.ui.systemDescription')">
          <NInput
            v-model:value="form.description"
            type="textarea"
            :rows="2"
            :placeholder="$t('page.ui.appDescription')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.redirectUri')" required>
          <NSpace vertical :size="8" class="w-full">
            <div
              v-for="(uri, index) in form.redirectUris"
              :key="index"
              class="flex gap-8px"
            >
              <NInput
                v-model:value="form.redirectUris[index]"
                placeholder="https://example.com/callback"
                class="flex-1"
              />
              <NButton
                v-if="form.redirectUris.length > 1"
                type="error"
                ghost
                size="small"
                @click="removeRedirectUri(index)"
              >
                {{ $t('page.ui.remove') }}
              </NButton>
            </div>
            <NButton
              type="default"
              size="small"
              block
              dashed
              @click="addRedirectUri"
            >
              {{ $t('page.ui.addRedirectUri') }}
            </NButton>
          </NSpace>
        </NFormItem>

        <NFormItem label="Scopes">
          <NSelect
            v-model:value="form.scopes"
            :options="scopeOptions"
            multiple
            :placeholder="$t('page.ui.selectScopes')"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.status')">
          <NRadioGroup v-model:value="form.status">
            <NRadio value="1">{{ $t('page.ui.enabled') }}</NRadio>
            <NRadio value="2">{{ $t('page.ui.disabled') }}</NRadio>
          </NRadioGroup>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace>
          <NButton @click="handleClose">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ type === "add" ? $t('common.add') : $t('page.ui.save') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
