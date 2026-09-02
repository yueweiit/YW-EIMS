<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NGrid, NGi, NInput, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({ name: 'ProductCard' });

interface Props {
  product: BoxLabel.ProductData;
  index: number;
  canDelete: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:product', value: BoxLabel.ProductData): void;
  (e: 'delete'): void;
}

const emit = defineEmits<Emits>();

function updateField(field: keyof BoxLabel.ProductData, value: string) {
  emit('update:product', { ...props.product, [field]: value });
}

function handleDelete() {
  emit('delete');
}
</script>

<template>
  <NCard :title="`📦 ${$t('page.ui.productItem')} ${index + 1}`" :bordered="true" class="product-card">
    <!-- 产品基本信息 Section -->
    <div class="section-title">{{ $t('page.ui.productBasicInfo') }}</div>
    <NForm label-placement="left" label-width="120px">
      <NGrid :cols="2" :x-gap="12">
        <NGi :span="2">
          <NFormItem :label="$t('page.ui.dateBatchEnglishName')">
            <NInput
              :value="product.dateBatchEnglishName"
              :placeholder="$t('page.ui.dateBatchEnglishNamePlaceholder')"
              @update:value="val => updateField('dateBatchEnglishName', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem :label="$t('page.ui.modelCode')">
            <NInput
              :value="product.modelCode"
              :placeholder="$t('page.ui.modelCodePlaceholder')"
              @update:value="val => updateField('modelCode', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem :label="$t('page.ui.specification')">
            <NInput
              :value="product.specification"
              :placeholder="$t('page.ui.specificationPlaceholder')"
              @update:value="val => updateField('specification', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem :label="$t('page.ui.spanishName')">
            <NInput
              :value="product.spanishName"
              :placeholder="$t('page.ui.spanishNamePlaceholder')"
              @update:value="val => updateField('spanishName', val)"
            />
          </NFormItem>
        </NGi>
      </NGrid>
    </NForm>

    <NDivider />

    <!-- 箱号数据 Section -->
    <div class="section-title">{{ $t('page.ui.boxData') }}</div>
    <NForm label-placement="left" label-width="120px">
      <NGrid :cols="3" :x-gap="12">
        <NGi>
          <NFormItem :label="$t('page.ui.boxNo')">
            <NInput
              :value="product.boxNo"
              :placeholder="$t('page.ui.boxNoPlaceholder')"
              @update:value="val => updateField('boxNo', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem :label="$t('page.ui.quantity')">
            <NInput
              :value="product.quantity"
              :placeholder="$t('page.ui.quantityPlaceholder')"
              @update:value="val => updateField('quantity', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem :label="$t('page.ui.weightKg')">
            <NInput
              :value="product.weightKg"
              :placeholder="$t('page.ui.weightKgPlaceholder')"
              @update:value="val => updateField('weightKg', val)"
            />
          </NFormItem>
        </NGi>
      </NGrid>
    </NForm>

    <NDivider />

    <!-- Delete Button -->
    <NSpace justify="end">
      <NButton type="error" ghost :disabled="!canDelete" @click="handleDelete">
        {{ $t('page.ui.deleteProduct') }}
      </NButton>
    </NSpace>
  </NCard>
</template>

<style scoped>
.product-card {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
</style>
