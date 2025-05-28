// backend/src/controllers/plantillaAulaController.js
const db = require('../db');

// Crear una nova plantilla d'aula (amb les seves taules)
const createPlantillaAula = async (req, res) => {
    const { nom_plantilla, descripcio_plantilla, taules } = req.body; // taules = [{ identificador_taula_dins_plantilla, capacitat }, ...]

    if (!nom_plantilla || !nom_plantilla.trim()) {
        return res.status(400).json({ success: false, message: "El nom de la plantilla d'aula és obligatori." });
    }
    if (!taules || !Array.isArray(taules) || taules.length === 0) {
        return res.status(400).json({ success: false, message: "S'ha de proporcionar almenys una taula per a la plantilla." });
    }

    for (const taula of taules) {
        if (!taula.identificador_taula_dins_plantilla || !taula.identificador_taula_dins_plantilla.trim()) {
            return res.status(400).json({ success: false, message: "Cada taula ha de tenir un identificador." });
        }
        if (taula.capacitat === undefined || isNaN(parseInt(taula.capacitat)) || parseInt(taula.capacitat) <= 0) {
            return res.status(400).json({ success: false, message: `La capacitat per a la taula '${taula.identificador_taula_dins_plantilla}' ha de ser un número positiu.` });
        }
    }

    try {
        await db.pool.query('BEGIN');

        // 1. Crear la plantilla d'aula
        const plantillaRes = await db.query(
            'INSERT INTO aula_plantilles (nom_plantilla, descripcio_plantilla) VALUES ($1, $2) RETURNING id_plantilla, nom_plantilla, descripcio_plantilla, created_at',
            [nom_plantilla.trim(), descripcio_plantilla || null]
        );
        const novaPlantilla = plantillaRes.rows[0];

        // 2. Crear les taules per a aquesta plantilla
        const taulesCreades = [];
        for (const taula of taules) {
            const taulaRes = await db.query(
                'INSERT INTO taules_plantilla (plantilla_id, identificador_taula_dins_plantilla, capacitat) VALUES ($1, $2, $3) RETURNING id_taula_plantilla, identificador_taula_dins_plantilla, capacitat',
                [novaPlantilla.id_plantilla, taula.identificador_taula_dins_plantilla.trim(), parseInt(taula.capacitat)]
            );
            taulesCreades.push(taulaRes.rows[0]);
        }

        await db.pool.query('COMMIT');

        novaPlantilla.taules = taulesCreades;
        res.status(201).json({ success: true, plantilla: novaPlantilla });

    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error("Error creant la plantilla d'aula:", error);
        if (error.code === '23505') { // unique_violation
            if (error.constraint === 'aula_plantilles_nom_plantilla_key') {
                return res.status(409).json({ success: false, message: `El nom de plantilla '${nom_plantilla}' ja existeix.` });
            }
            if (error.constraint === 'uq_identificador_taula_dins_plantilla') {
                 return res.status(409).json({ success: false, message: `Hi ha identificadors de taula duplicats dins la plantilla.` });
            }
        }
        res.status(500).json({ success: false, message: 'Error intern del servidor creant la plantilla.', error: error.message });
    }
};

// Obtenir totes les plantilles d'aula (sense les seves taules, només metadata)
const getAllPlantillesAula = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ap.id_plantilla, ap.nom_plantilla, ap.descripcio_plantilla, ap.created_at, COUNT(tp.id_taula_plantilla) as num_taules
             FROM aula_plantilles ap
             LEFT JOIN taules_plantilla tp ON ap.id_plantilla = tp.plantilla_id
             GROUP BY ap.id_plantilla
             ORDER BY ap.nom_plantilla ASC`
        );
        res.json({ success: true, plantilles: result.rows });
    } catch (error) {
        console.error("Error obtenint totes les plantilles d'aula:", error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Obtenir una plantilla d'aula específica (amb les seves taules)
const getPlantillaAulaById = async (req, res) => {
    const { id_plantilla } = req.params;

    console.log("------- INICI getPlantillaAulaById -------");
    console.log("req.params:", JSON.stringify(req.params, null, 2));
    console.log("Valor de 'id_plantilla' extret:", id_plantilla);
    console.log("Tipus de 'id_plantilla':", typeof id_plantilla);

    try {
        const plantillaRes = await db.query(
            'SELECT id_plantilla, nom_plantilla, descripcio_plantilla, created_at FROM aula_plantilles WHERE id_plantilla = $1',
            [id_plantilla]
        );

        if (plantillaRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Plantilla d\'aula no trobada.' });
        }
        const plantilla = plantillaRes.rows[0];

        const taulesRes = await db.query(
            'SELECT id_taula_plantilla, identificador_taula_dins_plantilla, capacitat FROM taules_plantilla WHERE plantilla_id = $1 ORDER BY identificador_taula_dins_plantilla ASC',
            [id_plantilla]
        );
        plantilla.taules = taulesRes.rows;

        res.json({ success: true, plantilla });
    } catch (error) {
        console.error(`Error obtenint la plantilla d'aula ${id_plantilla}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Esborrar una plantilla d'aula (i les seves taules i distribucions associades via ON DELETE CASCADE)
const deletePlantillaAula = async (req, res) => {
    const { id_plantilla } = req.params;
    try {
        const result = await db.query('DELETE FROM aula_plantilles WHERE id_plantilla = $1 RETURNING id_plantilla', [id_plantilla]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Plantilla d\'aula no trobada per esborrar.' });
        }
        res.json({ success: true, message: `Plantilla d'aula ${id_plantilla} esborrada correctament.` });
    } catch (error) {
        console.error(`Error esborrant la plantilla d'aula ${id_plantilla}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};


module.exports = {
    createPlantillaAula,
    getAllPlantillesAula,
    getPlantillaAulaById,
    deletePlantillaAula,
};