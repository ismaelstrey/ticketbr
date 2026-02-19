-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables to use the function
CREATE TRIGGER update_solicitante_updated_at
    BEFORE UPDATE ON "Solicitante"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tipo_ticket_updated_at
    BEFORE UPDATE ON "Tipo_Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categoria_ticket_updated_at
    BEFORE UPDATE ON "Categoria_Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mesa_trabalho_updated_at
    BEFORE UPDATE ON "Mesa_Trabalho"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operador_updated_at
    BEFORE UPDATE ON "Operador"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to validate CNPJ (simple length check for now)
CREATE OR REPLACE FUNCTION validate_cnpj()
RETURNS TRIGGER AS $$
BEGIN
    IF LENGTH(NEW.cnpj) != 14 THEN
        RAISE EXCEPTION 'CNPJ must be 14 characters long';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_solicitante_cnpj
    BEFORE INSERT OR UPDATE ON "Solicitante"
    FOR EACH ROW
    EXECUTE FUNCTION validate_cnpj();

-- Function to ensure SLA is positive
CREATE OR REPLACE FUNCTION validate_sla_positive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_horas < 0 THEN
        RAISE EXCEPTION 'SLA hours must be positive';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_tipo_ticket_sla
    BEFORE INSERT OR UPDATE ON "Tipo_Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION validate_sla_positive();
