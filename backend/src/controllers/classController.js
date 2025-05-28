// backend/src/controllers/classController.js
const db = require('../db');

// Crear una nova classe
const createClass = async (req, res) => {
    const { nom_classe, descripcio_classe } = req.body;
    if (!nom_classe || !nom_classe.trim()) {
        return res.status(400).json({ success: false, message: "El nom de la classe és obligatori." });
    }
    try {
        const result = await db.query(
            'INSERT INTO classes (nom_classe, descripcio_classe) VALUES ($1, $2) RETURNING *',
            [nom_classe.trim(), descripcio_classe || null]
        );
        res.status(201).json({ success: true, classe: result.rows[0] });
    } catch (error) {
        console.error("Error creant la classe:", error);
        if (error.code === '23505') { // unique_violation
            return res.status(409).json({ success: false, message: `La classe '${nom_classe}' ja existeix.` });
        }
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Obtenir totes les classes
const getAllClasses = async (req, res) => {
    try {
        const result = await db.query('SELECT id_classe, nom_classe, descripcio_classe, created_at FROM classes ORDER BY nom_classe ASC');
        res.json({ success: true, classes: result.rows });
    } catch (error) {
        console.error("Error obtenint totes les classes:", error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Obtenir una classe per ID
const getClassById = async (req, res) => {
    const { id_classe } = req.params;
    try {
        const result = await db.query('SELECT id_classe, nom_classe, descripcio_classe, created_at FROM classes WHERE id_classe = $1', [id_classe]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Classe no trobada.' });
        }
        res.json({ success: true, classe: result.rows[0] });
    } catch (error) {
        console.error(`Error obtenint la classe ${id_classe}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Actualitzar una classe
const updateClass = async (req, res) => {
    const { id_classe } = req.params;
    const { nom_classe, descripcio_classe } = req.body;

    if (!nom_classe || !nom_classe.trim()) {
        return res.status(400).json({ success: false, message: "El nom de la classe és obligatori." });
    }

    try {
        const result = await db.query(
            'UPDATE classes SET nom_classe = $1, descripcio_classe = $2, updated_at = CURRENT_TIMESTAMP WHERE id_classe = $3 RETURNING *',
            [nom_classe.trim(), descripcio_classe || null, id_classe]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Classe no trobada per actualitzar.' });
        }
        res.json({ success: true, classe: result.rows[0] });
    } catch (error) {
        console.error(`Error actualitzant la classe ${id_classe}:`, error);
        if (error.code === '23505') { // unique_violation
            return res.status(409).json({ success: false, message: `El nom de classe '${nom_classe}' ja existeix.` });
        }
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Esborrar una classe
// ON DELETE SET NULL a la taula students s'encarregarà de desassignar la classe dels alumnes.
// ON DELETE CASCADE a la taula distribucio_classes_filter s'encarregarà d'eliminar els filtres associats.
const deleteClass = async (req, res) => {
    const { id_classe } = req.params;
    try {
        // Primer, actualitzem els alumnes que tenen aquesta classe a NULL
        // Aquesta part és important per si hi ha restriccions a la BD o lògica addicional
        // Encara que ON DELETE SET NULL ho faria, ser explícit pot ser més segur o permetre lògica addicional.
        // No obstant, amb ON DELETE SET NULL, aquest pas no és estrictament necessari si només es vol desvincular.
        // Per simplicitat i confiant en la BD:
        const result = await db.query('DELETE FROM classes WHERE id_classe = $1 RETURNING id_classe', [id_classe]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Classe no trobada per esborrar.' });
        }
        res.json({ success: true, message: `Classe ${id_classe} esborrada correctament. Els alumnes han estat desassignats d'aquesta classe.` });
    } catch (error) {
        console.error(`Error esborrant la classe ${id_classe}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

module.exports = {
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
};