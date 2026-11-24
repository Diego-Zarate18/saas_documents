-- E-2.2: reglas que un CHECK no puede expresar.

-- Bitácora inmutable (D-20, D-102): movimiento y movimiento_origen solo admiten INSERT.
CREATE FUNCTION rechazar_cambio() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% es de solo inserción: no admite %', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END $$;

CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON movimiento
  FOR EACH ROW EXECUTE FUNCTION rechazar_cambio();
CREATE TRIGGER movimiento_origen_inmutable BEFORE UPDATE OR DELETE ON movimiento_origen
  FOR EACH ROW EXECUTE FUNCTION rechazar_cambio();
-- El folio tampoco cambia una vez asignado.
CREATE TRIGGER folio_inmutable BEFORE UPDATE OR DELETE ON folio
  FOR EACH ROW EXECUTE FUNCTION rechazar_cambio();

-- Tipo de documento inmutable (D-26).
CREATE FUNCTION documento_tipo_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'El tipo de un documento no cambia (D-26)' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER documento_tipo_inmutable BEFORE UPDATE OF tipo ON documento
  FOR EACH ROW EXECUTE FUNCTION documento_tipo_inmutable();

-- Las siglas forman el folio: no cambian si el área ya tiene folios (D-61).
CREATE FUNCTION area_siglas_con_folios() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.siglas IS DISTINCT FROM OLD.siglas AND EXISTS (SELECT 1 FROM folio WHERE id_area = OLD.id_area) THEN
    RAISE EXCEPTION 'Las siglas de un área con folios no cambian (D-61)' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER area_siglas_con_folios BEFORE UPDATE OF siglas ON area
  FOR EACH ROW EXECUTE FUNCTION area_siglas_con_folios();

-- El acuse es solo de una salida (O-21, D-58).
CREATE FUNCTION acuse_solo_salida() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM documento WHERE id_documento = NEW.id_documento AND sentido = 'salida') THEN
    RAISE EXCEPTION 'Solo una salida tiene acuse' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acuse_solo_salida BEFORE INSERT OR UPDATE ON acuse
  FOR EACH ROW EXECUTE FUNCTION acuse_solo_salida();

-- Orígenes adicionales solo de una atracción y distintos del origen principal (D-68).
CREATE FUNCTION movimiento_origen_de_atraccion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM movimiento
    WHERE id_movimiento = NEW.id_movimiento AND tipo = 'atraccion' AND id_area_origen <> NEW.id_area
  ) THEN
    RAISE EXCEPTION 'movimiento_origen solo admite movimientos de atracción con un área distinta del origen'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER movimiento_origen_de_atraccion BEFORE INSERT ON movimiento_origen
  FOR EACH ROW EXECUTE FUNCTION movimiento_origen_de_atraccion();
