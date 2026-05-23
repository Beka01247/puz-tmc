-- Add IV категория field to users table
ALTER TABLE users 
ADD COLUMN iv_category BOOLEAN DEFAULT FALSE;

-- Add iv-category to measurement type enum
ALTER TYPE "measurementType" ADD VALUE 'iv-category';

-- Optional: Set initial values for existing ПУЗ patients (all default to No/false)
-- No action needed as default is already false

-- To query ПУЗ patients with IV category:
SELECT u.full_name, u.iv_category, rg.condition
FROM users u
JOIN risk_groups rg ON rg.user_id = u.id
WHERE rg.name = 'ПУЗ'
  AND rg.condition IN ('АГ', 'СД', 'ХСН');