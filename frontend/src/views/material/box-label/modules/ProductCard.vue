<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NGrid, NGi, NInput, NSpace } from 'naive-ui';

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
  <NCard :title="`📦 产品 ${index + 1}`" :bordered="true" class="product-card">
    <!-- 产品基本信息 Section -->
    <div class="section-title">产品基本信息</div>
    <NForm label-placement="left" label-width="120px">
      <NGrid :cols="2" :x-gap="12">
        <NGi :span="2">
          <NFormItem label="日期/批次/英文名称">
            <NInput
              :value="product.dateBatchEnglishName"
              placeholder="请输入日期/批次/英文名称"
              @update:value="val => updateField('dateBatchEnglishName', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem label="品名编码（型号）">
            <NInput
              :value="product.modelCode"
              placeholder="请输入品名编码或型号"
              @update:value="val => updateField('modelCode', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem label="规格">
            <NInput
              :value="product.specification"
              placeholder="请输入规格"
              @update:value="val => updateField('specification', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem label="西语名称">
            <NInput
              :value="product.spanishName"
              placeholder="请输入西班牙语名称"
              @update:value="val => updateField('spanishName', val)"
            />
          </NFormItem>
        </NGi>
      </NGrid>
    </NForm>

    <NDivider />

    <!-- 箱号数据 Section -->
    <div class="section-title">箱号数据</div>
    <NForm label-placement="left" label-width="120px">
      <NGrid :cols="3" :x-gap="12">
        <NGi>
          <NFormItem label="箱号">
            <NInput
              :value="product.boxNo"
              placeholder="请输入箱号"
              @update:value="val => updateField('boxNo', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem label="数量">
            <NInput
              :value="product.quantity"
              placeholder="请输入数量"
              @update:value="val => updateField('quantity', val)"
            />
          </NFormItem>
        </NGi>
        <NGi>
          <NFormItem label="重量 (KG)">
            <NInput
              :value="product.weightKg"
              placeholder="请输入重量"
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
        删除此产品
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
