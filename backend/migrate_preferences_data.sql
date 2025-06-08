-- Script per migrar les preferències existents a un model unidireccional

-- Crear una taula temporal amb totes les preferències existents
CREATE TEMP TABLE temp_preferences AS (
  SELECT student_id_1, student_id_2 FROM student_preferences
);

-- Eliminar totes les preferències existents
TRUNCATE student_preferences;

-- Reinserir les preferències mantenint la direccionalitat original
-- Inserim ambdues direccions per mantenir la compatibilitat amb dades antigues
INSERT INTO student_preferences (student_id_1, student_id_2)
SELECT student_id_1, student_id_2 FROM temp_preferences
UNION -- Evitem duplicats
SELECT student_id_2, student_id_1 FROM temp_preferences;

-- Eliminar la taula temporal
DROP TABLE temp_preferences;

-- Eliminar només les preferències on l'alumne es prefereix a si mateix
DELETE FROM student_preferences WHERE student_id_1 = student_id_2;
