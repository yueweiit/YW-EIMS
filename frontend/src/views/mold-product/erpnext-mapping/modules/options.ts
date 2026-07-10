export const erpNextMappingTypeOptions: Array<{
  label: string;
  value: Api.ErpNextMapping.MappingType;
}> = [
  { label: '物料组', value: 'ITEM_GROUP' },
  { label: '模具物料组', value: 'MOLD_ITEM_GROUP' },
  { label: '产品物料组', value: 'PRODUCT_ITEM_GROUP' },
  { label: '单位', value: 'UNIT' }
];

export function getErpNextMappingTypeLabel(type: Api.ErpNextMapping.MappingType) {
  return erpNextMappingTypeOptions.find(item => item.value === type)?.label || type;
}
