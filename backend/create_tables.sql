-- Eliminar taules existents en l'ordre correcte per evitar problemes de FK
DROP TABLE IF EXISTS distribucio_assignacions CASCADE;
DROP TABLE IF EXISTS distribucions CASCADE;
DROP TABLE IF EXISTS taules_plantilla CASCADE;
DROP TABLE IF EXISTS aula_plantilles CASCADE;
DROP TABLE IF EXISTS student_restrictions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
-- La taula 'tables' original ja no és necessària amb el nou model.

-- Taula d'Alumnes (students)
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    academic_grade NUMERIC(4, 2) CHECK (academic_grade >= 0 AND academic_grade <= 10),
    gender VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger per actualitzar 'updated_at' a 'students'
CREATE OR REPLACE FUNCTION trigger_set_timestamp_students()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_students
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp_students();

-- Taula de Restriccions entre Alumnes (student_restrictions)
CREATE TABLE student_restrictions (
    student_id_1 INT NOT NULL,
    student_id_2 INT NOT NULL,
    PRIMARY KEY (student_id_1, student_id_2),
    CONSTRAINT fk_student1
        FOREIGN KEY(student_id_1)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_student2
        FOREIGN KEY(student_id_2)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT check_different_students CHECK (student_id_1 < student_id_2) -- Per evitar duplicats (A,B) i (B,A) i restriccions amb si mateix
);

-- Taula de Plantilles d'Aula (aula_plantilles)
CREATE TABLE aula_plantilles (
    id_plantilla SERIAL PRIMARY KEY,
    nom_plantilla VARCHAR(255) NOT NULL UNIQUE,
    descripcio_plantilla TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger per actualitzar 'updated_at' a 'aula_plantilles'
CREATE OR REPLACE FUNCTION trigger_set_timestamp_aula_plantilles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_aula_plantilles
BEFORE UPDATE ON aula_plantilles
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp_aula_plantilles();

-- Taula de Taules dins de cada Plantilla (taules_plantilla)
CREATE TABLE taules_plantilla (
    id_taula_plantilla SERIAL PRIMARY KEY,
    plantilla_id INT NOT NULL,
    identificador_taula_dins_plantilla VARCHAR(100) NOT NULL,
    capacitat INT NOT NULL CHECK (capacitat > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- No cal updated_at si són immutables un cop creades amb la plantilla

    CONSTRAINT fk_plantilla_taula
        FOREIGN KEY(plantilla_id)
        REFERENCES aula_plantilles(id_plantilla)
        ON DELETE CASCADE,

    CONSTRAINT uq_identificador_taula_dins_plantilla
        UNIQUE (plantilla_id, identificador_taula_dins_plantilla)
);

-- Taula de Distribucions (distribucions)
CREATE TABLE distribucions (
    id_distribucio SERIAL PRIMARY KEY,
    plantilla_id INT NOT NULL,
    nom_distribucio VARCHAR(255) NOT NULL,
    descripcio_distribucio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_distribucio_plantilla
        FOREIGN KEY(plantilla_id)
        REFERENCES aula_plantilles(id_plantilla)
        ON DELETE CASCADE
    -- Podries afegir UNIQUE(plantilla_id, nom_distribucio) si vols que els noms de distribució siguin únics per plantilla
);

-- Trigger per actualitzar 'updated_at' a 'distribucions'
CREATE OR REPLACE FUNCTION trigger_set_timestamp_distribucions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_distribucions
BEFORE UPDATE ON distribucions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp_distribucions();

-- Taula d'Assignacions d'Alumnes a Taules en una Distribució (distribucio_assignacions)
CREATE TABLE distribucio_assignacions (
    id_assignacio SERIAL PRIMARY KEY,
    distribucio_id INT NOT NULL,
    alumne_id INT NOT NULL,
    taula_plantilla_id INT, -- Pot ser NULL si l'alumne està al "pool" dins d'una distribució desada

    CONSTRAINT fk_assignacio_distribucio
        FOREIGN KEY(distribucio_id)
        REFERENCES distribucions(id_distribucio)
        ON DELETE CASCADE,
    CONSTRAINT fk_assignacio_alumne
        FOREIGN KEY(alumne_id)
        REFERENCES students(id)
        ON DELETE CASCADE, -- Com hem acordat
    CONSTRAINT fk_assignacio_taula_plantilla
        FOREIGN KEY(taula_plantilla_id)
        REFERENCES taules_plantilla(id_taula_plantilla)
        ON DELETE CASCADE, -- Si s'esborra la taula de la plantilla, l'assignació no té sentit

    CONSTRAINT uq_distribucio_alumne -- Un alumne només pot estar un cop per distribució (o en una taula o al pool implícit)
        UNIQUE (distribucio_id, alumne_id)
);

-- Índexs recomanats per millorar el rendiment de les consultes
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_aula_plantilles_nom ON aula_plantilles(nom_plantilla);
CREATE INDEX IF NOT EXISTS idx_taules_plantilla_plantilla_id ON taules_plantilla(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_distribucions_plantilla_id ON distribucions(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_distribucio_assignacions_distribucio_id ON distribucio_assignacions(distribucio_id);
CREATE INDEX IF NOT EXISTS idx_distribucio_assignacions_alumne_id ON distribucio_assignacions(alumne_id);
CREATE INDEX IF NOT EXISTS idx_distribucio_assignacions_taula_plantilla_id ON distribucio_assignacions(taula_plantilla_id);
