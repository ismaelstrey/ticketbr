CREATE OR REPLACE FUNCTION validate_cnpj()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cnpj IS NULL OR (LENGTH(NEW.cnpj) != 11 AND LENGTH(NEW.cnpj) != 14) THEN
        RAISE EXCEPTION 'CPF/CNPJ must be 11 or 14 characters long';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

