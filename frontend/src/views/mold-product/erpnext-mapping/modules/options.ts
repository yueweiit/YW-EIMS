import { $t } from '@/locales';
import { computed } from 'vue';

export const erpNextMappingTypeOptions = computed<Array<{
  label: string;
  value: Api.ErpNextMapping.MappingType;
}>>(() => [
  { label: $t('page.ui.mappingTypeMaterialGroup'), value: 'ITEM_GROUP' },
  { label: $t('page.ui.mappingTypeMoldMaterialGroup'), value: 'MOLD_ITEM_GROUP' },
  { label: $t('page.ui.mappingTypeProductMaterialGroup'), value: 'PRODUCT_ITEM_GROUP' },
  { label: $t('page.ui.mappingTypeUnit'), value: 'UNIT' }
]);

export function getErpNextMappingTypeLabel(type: Api.ErpNextMapping.MappingType) {
  return erpNextMappingTypeOptions.value.find(item => item.value === type)?.label || type;
}
