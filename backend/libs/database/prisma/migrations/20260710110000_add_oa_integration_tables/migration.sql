CREATE SCHEMA IF NOT EXISTS "oa";

CREATE TABLE IF NOT EXISTS "oa"."oa_mapping" (
    "oa_code" VARCHAR(100) NOT NULL,
    "instance_id" VARCHAR(100) NOT NULL,
    "process_code" VARCHAR(100),
    "form_name" VARCHAR(255),
    "ding_create_time" TIMESTAMP(3),
    "update_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oa_mapping_pkey" PRIMARY KEY ("oa_code")
);

CREATE TABLE IF NOT EXISTS "oa"."ding_employee" (
    "ding_userid" VARCHAR(100) NOT NULL,
    "emp_name" VARCHAR(200),
    "dept_id" INTEGER,
    "title" VARCHAR(200),
    "is_boss" VARCHAR(10),

    CONSTRAINT "ding_employee_pkey" PRIMARY KEY ("ding_userid")
);

CREATE TABLE IF NOT EXISTS "oa"."ding_department" (
    "dept_id" INTEGER NOT NULL,
    "dept_name" VARCHAR(200),
    "parent_dept_id" INTEGER,

    CONSTRAINT "ding_department_pkey" PRIMARY KEY ("dept_id")
);

CREATE TABLE IF NOT EXISTS "oa"."erp_supplier" (
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "update_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_supplier_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "oa"."erp_material" (
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "specification" VARCHAR(500),
    "update_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_material_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "oa"."erp_unit" (
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "update_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_unit_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "oa"."erp_tax" (
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "rate_value" DECIMAL(10,4),
    "update_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_tax_pkey" PRIMARY KEY ("code")
);
