-- Update template_type enum to include four templates
DO $$ BEGIN
    CREATE TYPE template_type_new AS ENUM ('classic', 'modern', 'professional', 'minimal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If template_type already exists as a different enum, we need to alter it
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE report_cards ALTER COLUMN template DROP DEFAULT;
    
    -- Update the column type
    ALTER TABLE report_cards 
    ALTER COLUMN template TYPE template_type_new 
    USING template::text::template_type_new;
    
    -- Set new default
    ALTER TABLE report_cards ALTER COLUMN template SET DEFAULT 'classic'::template_type_new;
    
    -- Drop old type if it exists
    DROP TYPE IF EXISTS template_type;
    
    -- Rename new type
    ALTER TYPE template_type_new RENAME TO template_type;
EXCEPTION
    WHEN OTHERS THEN
        -- If template column doesn't exist, create it
        BEGIN
            ALTER TABLE report_cards 
            ADD COLUMN IF NOT EXISTS template template_type DEFAULT 'classic'::template_type;
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
END $$;