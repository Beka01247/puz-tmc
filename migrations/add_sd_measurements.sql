-- ПУЗ (Patients Under Dispensary Observation) System Migration
-- This migration adds all necessary tables, columns, and measurement types for ПУЗ functionality
-- Supports three conditions: АГ (Arterial Hypertension), СД (Diabetes), ХСН (Heart Failure)

-- =============================================================================
-- STEP 1: Create risk_groups table if it doesn't exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS "risk_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "risk_groups_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") 
    REFERENCES "public"."users"("id") 
    ON DELETE cascade 
    ON UPDATE no action
);

-- =============================================================================
-- STEP 2: Add condition column to risk_groups table
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'risk_groups' AND column_name = 'condition'
  ) THEN
    ALTER TABLE "risk_groups" ADD COLUMN "condition" varchar(50);
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Add new measurement types for all ПУЗ conditions
-- =============================================================================

-- Common measurements (already may exist, but adding for completeness)
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'bmi';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'smoking';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'eye-exam';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'foot-exam';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'hba1c';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'ldl-cholesterol';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'total-cholesterol';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'egfr';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'creatinine';

-- СД (Diabetes) specific measurements
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'urine-microalbumin';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'urine-creatinine';

-- ХСН (Heart Failure) specific measurements
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'sodium';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'potassium';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'probnp';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'ejection-fraction';
ALTER TYPE "measurementType" ADD VALUE IF NOT EXISTS 'echocardiography';

-- =============================================================================
-- STEP 4: Create indexes for better query performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS "idx_risk_groups_user_id" ON "risk_groups"("user_id");
CREATE INDEX IF NOT EXISTS "idx_risk_groups_name" ON "risk_groups"("name");
CREATE INDEX IF NOT EXISTS "idx_risk_groups_condition" ON "risk_groups"("condition");
CREATE INDEX IF NOT EXISTS "idx_measurements_user_id_type" ON "measurements"("user_id", "type");
CREATE INDEX IF NOT EXISTS "idx_measurements_created_at" ON "measurements"("created_at" DESC);

-- =============================================================================
-- STEP 5: Add участок (medical district) column to users if not exists
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'участок'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "участок" varchar(100);
  END IF;
END $$;

-- =============================================================================
-- COMPLETED: All ПУЗ system tables and measurement types have been added
-- =============================================================================
