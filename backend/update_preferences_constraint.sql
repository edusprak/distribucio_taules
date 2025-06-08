-- Script per eliminar la restricció que obliga a ordenar els IDs en les preferències d'alumnes

ALTER TABLE student_preferences DROP CONSTRAINT IF EXISTS check_different_students_preference;

-- Afegir una nova restricció que només impedeixi preferències amb si mateix
ALTER TABLE student_preferences ADD CONSTRAINT check_no_self_preference CHECK (student_id_1 != student_id_2);
