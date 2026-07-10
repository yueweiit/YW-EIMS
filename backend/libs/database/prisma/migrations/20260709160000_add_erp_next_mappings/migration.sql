-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "oa";

-- CreateTable
CREATE TABLE "oa"."erp_next_mappings" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "source_key" VARCHAR(50) NOT NULL,
    "target_value" VARCHAR(200) NOT NULL,

    CONSTRAINT "erp_next_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "erp_next_mappings_type_source_key_key" ON "oa"."erp_next_mappings"("type", "source_key");
CREATE INDEX "erp_next_mappings_type_idx" ON "oa"."erp_next_mappings"("type");

-- Seed: ITEM_GROUP
INSERT INTO "oa"."erp_next_mappings" ("type", "source_key", "target_value") VALUES
('ITEM_GROUP', 'CW', 'CW 宠物用品'),
('ITEM_GROUP', 'FL', 'FL Suministros Auxiliares辅料'),
('ITEM_GROUP', 'GJ', 'GJ Herramienta工具'),
('ITEM_GROUP', 'GL', 'GL 钢料acero'),
('ITEM_GROUP', 'KG', 'KG 客供物料por el cliente'),
('ITEM_GROUP', 'KGFL', 'KG 客供物料por el cliente'),
('ITEM_GROUP', 'MJ', 'MJ Molde模具/模架'),
('ITEM_GROUP', 'RC', 'RC 日常办公'),
('ITEM_GROUP', 'SB', 'SB Equipo设备'),
('ITEM_GROUP', 'SP', 'SP SP'),
('ITEM_GROUP', 'WJ', 'WJ WJ'),
('ITEM_GROUP', 'YL', 'YL Materia prima原料');

-- Seed: PRODUCT_ITEM_GROUP
INSERT INTO "oa"."erp_next_mappings" ("type", "source_key", "target_value") VALUES
('PRODUCT_ITEM_GROUP', 'NBA1010', 'NBA1010 Rainbow 2.0/注塑 TPU-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NBA1020', 'NBA1020 Rainbow 2.0/注塑 PC-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NBA2030', 'NBA2030 亮甲打印 Rainbow Imprimir'),
('PRODUCT_ITEM_GROUP', 'NBA3010', 'NBA3010 Rainbow 2.0/喷油TPU-Pintura'),
('PRODUCT_ITEM_GROUP', 'NBA3020', 'NBA3020 Rainbow 2.0/喷油PC-Pintura'),
('PRODUCT_ITEM_GROUP', 'NBA4030', 'NBA4030 Rainbow 2.0/组装-ENSAMBLE'),
('PRODUCT_ITEM_GROUP', 'NBD1010', 'NBD1010 Blindaje/注塑 TPU-Inyección'),
('PRODUCT_ITEM_GROUP', 'NBD1020', 'NBD1020 Blindaje Kit/注塑 ABS-Inyección'),
('PRODUCT_ITEM_GROUP', 'NBD1021', 'NBD1021 Accesorios de Blindaje/注塑 ABS-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NBD1022', 'NBD1022 圣殿配件'),
('PRODUCT_ITEM_GROUP', 'NBD4030', 'NBD4030 Blindaje/组装-ENSAMBLE'),
('PRODUCT_ITEM_GROUP', 'NFA1010', 'NFA1010 Fantasía/注塑 TPU-Inyección'),
('PRODUCT_ITEM_GROUP', 'NFA1020', 'NFA1020 Fantasía/注塑 PC-Inyección'),
('PRODUCT_ITEM_GROUP', 'NFA2020', 'NFA2020 骑士打印PC'),
('PRODUCT_ITEM_GROUP', 'NFA3020', 'NFA3020 Fantasía/喷油PC-Pintura'),
('PRODUCT_ITEM_GROUP', 'NFA4020', 'NFA4020 Fantasía/组装-Ensamble'),
('PRODUCT_ITEM_GROUP', 'NFA4030', 'NFA4030 Fantasía/喷油'),
('PRODUCT_ITEM_GROUP', 'NFB1010', 'NFB1010 titanio骑士2.0/注塑 TPU-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NFB1020', 'NFB1020 titanio骑士2.0/注塑 PC-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NFB2020', 'NFB2020 titanio/骑士2.0打印PC'),
('PRODUCT_ITEM_GROUP', 'NFB3020', 'NFB3020 titanio骑士2.0/喷油 PC-PINTURA'),
('PRODUCT_ITEM_GROUP', 'NFB4020', 'NFB4020 titanio骑士2.0/组装-ENSAMBLE'),
('PRODUCT_ITEM_GROUP', 'NFB4030', 'NFB4030 titanio/骑士2.0/喷油'),
('PRODUCT_ITEM_GROUP', 'NHA000', 'NHA000 超队配件'),
('PRODUCT_ITEM_GROUP', 'NHA1010', 'NHA1010 Súper Capitán/注塑 TPU-Inyección'),
('PRODUCT_ITEM_GROUP', 'NHA1020', 'NHA1010 Súper Capitán/注塑 PC-Inyección'),
('PRODUCT_ITEM_GROUP', 'NHA2020', 'NHA2020 Súper Capitán/打印PC-Pintura'),
('PRODUCT_ITEM_GROUP', 'NHA3020', 'NHA3020 Súper Capitán/喷油PC-Pintura'),
('PRODUCT_ITEM_GROUP', 'NHA4020', 'NHA4020 Súper Capitán/打印组装'),
('PRODUCT_ITEM_GROUP', 'NHA4030', 'NHA4030 Súper Capitán/组装-Ensamble'),
('PRODUCT_ITEM_GROUP', 'NWV1010', 'NWV1010 waves/注塑 TPU-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NWV4030', 'NWV4030 waves/组装-ENSAMBLE'),
('PRODUCT_ITEM_GROUP', 'NDN1010', 'NDN1010 Alterna/注塑 TPU-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NDN1020', 'NDN1020 Alterna/注塑 PC-INYECCION'),
('PRODUCT_ITEM_GROUP', 'NDN2030', 'NDN2030 Alterna/UV PC'),
('PRODUCT_ITEM_GROUP', 'NDN4030', 'NDN4030 Alterna/组装-ENSAMBLE');

-- Seed: MOLD_ITEM_GROUP
INSERT INTO "oa"."erp_next_mappings" ("type", "source_key", "target_value") VALUES
('MOLD_ITEM_GROUP', 'MBA10', 'MBA10 Rainbow 2.0 亮甲2.0-TPU'),
('MOLD_ITEM_GROUP', 'MBA20', 'MBA20 Rainbow 2.0 亮甲2.0-PC'),
('MOLD_ITEM_GROUP', 'MBD10', 'MBD10 Blindaje 圣殿BD-TPU'),
('MOLD_ITEM_GROUP', 'MBD20', 'MBD20 Blindaje 圣殿BD-PC'),
('MOLD_ITEM_GROUP', 'MDN10', 'MDN10 Alterna 幻甲-TPU'),
('MOLD_ITEM_GROUP', 'MDN20', 'MDN20 Alterna 幻甲-PC'),
('MOLD_ITEM_GROUP', 'MFA10', 'MFA10 Fantasía 骑士FA-TPU'),
('MOLD_ITEM_GROUP', 'MFA20', 'MFA20 Fantasía 骑士FA-PC'),
('MOLD_ITEM_GROUP', 'MFB10', 'MFB10 Titanio 骑士2.0FB-TPU'),
('MOLD_ITEM_GROUP', 'MFB20', 'MFB20 Titanio 骑士2.0FB-PC'),
('MOLD_ITEM_GROUP', 'MWV10', 'MWV10 薇武士waves-TPU');

-- Seed: UNIT
INSERT INTO "oa"."erp_next_mappings" ("type", "source_key", "target_value") VALUES
('UNIT', '个', '个：pieza'),
('UNIT', '件', '件：pieza'),
('UNIT', '颗', '颗：pieza'),
('UNIT', '根', '根：pieza'),
('UNIT', '包', '包：paquete'),
('UNIT', '箱', '箱：caja'),
('UNIT', '套', '套：set'),
('UNIT', '台', '台：unidad'),
('UNIT', 'kg', 'kg'),
('UNIT', 'KG', 'kg'),
('UNIT', 'g', 'g'),
('UNIT', 'm', 'm'),
('UNIT', '米', '米：metro'),
('UNIT', 'm²', 'm²'),
('UNIT', 'm2', 'm²');
