<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NCard, NSpace } from 'naive-ui';
import ProductCard from './modules/ProductCard.vue';
import { generateBoxLabelPdf } from './modules/pdf-generator';
import { parseExcelFile, downloadTemplate } from './modules/excel-importer';

defineOptions({ name: 'BoxLabel' });

const fileInputRef = ref<HTMLInputElement | null>(null);
const products = ref<BoxLabel.ProductData[]>([createEmptyProduct()]);

function createEmptyProduct(): BoxLabel.ProductData {
  return {
    dateBatchEnglishName: '',
    modelCode: '',
    specification: '',
    spanishName: '',
    boxNo: '',
    quantity: '',
    weightKg: ''
  };
}

function addProduct() {
  products.value.push(createEmptyProduct());
}

function removeProduct(index: number) {
  if (products.value.length > 1) {
    products.value.splice(index, 1);
  }
}

function updateProduct(index: number, value: BoxLabel.ProductData) {
  products.value[index] = value;
}

function handleGeneratePdf() {
  generateBoxLabelPdf(products.value);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const result = await parseExcelFile(file);
    products.value = result.products;
    window.$message?.success(`成功导入 ${result.products.length} 条产品数据`);
  } catch (err) {
    window.$message?.error(err instanceof Error ? err.message : '导入失败');
  } finally {
    // Reset input so the same file can be re-imported
    input.value = '';
  }
}
</script>

<template>
  <div class="box-label-page">
    <NCard title="外箱标签生成器" :bordered="false">
      <template #header-extra>
        <span class="text-gray-400">填写产品信息，生成打印标签</span>
      </template>

      <!-- Product Cards -->
      <div class="product-list">
        <ProductCard
          v-for="(product, index) in products"
          :key="index"
          :product="product"
          :index="index"
          :can-delete="products.length > 1"
          @update:product="val => updateProduct(index, val)"
          @delete="removeProduct(index)"
        />
      </div>

      <!-- Bottom Action Area -->
      <NSpace justify="center" class="action-area">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.csv"
          style="display: none"
          @change="handleFileChange"
        />
        <NButton type="info" ghost @click="triggerFileInput">
          📥 导入 Excel
        </NButton>
        <NButton type="default" ghost @click="downloadTemplate">
          📄 下载模板
        </NButton>
        <NButton type="primary" ghost @click="addProduct">
          + 添加更多产品
        </NButton>
        <NButton type="primary" @click="handleGeneratePdf">
          🎯 生成 PDF 标签
        </NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.box-label-page {
  padding: 16px;
}

.product-list {
  margin-bottom: 24px;
}

.action-area {
  padding-top: 16px;
  border-top: 1px solid #efeff5;
}
</style>
