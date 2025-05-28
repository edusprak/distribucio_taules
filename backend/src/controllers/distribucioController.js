// backend/src/controllers/distribucioController.js
const db = require('../db');

// Desar una nova distribució
const saveDistribucio = async (req, res) => {
    const { nom_distribucio, descripcio_distribucio, plantilla_id, assignacions } = req.body;
    // assignacions = [{ alumne_id, taula_plantilla_id }, ...]

    if (!nom_distribucio || !nom_distribucio.trim()) {
        return res.status(400).json({ success: false, message: "El nom de la distribució és obligatori." });
    }
    if (plantilla_id === undefined || isNaN(parseInt(plantilla_id))) {
        return res.status(400).json({ success: false, message: "Falta l'ID de la plantilla d'aula." });
    }
    if (!assignacions || !Array.isArray(assignacions)) {
        return res.status(400).json({ success: false, message: "S'ha de proporcionar un array d'assignacions." });
    }

    try {
        await db.pool.query('BEGIN');

        const distribucioRes = await db.query(
            'INSERT INTO distribucions (nom_distribucio, descripcio_distribucio, plantilla_id) VALUES ($1, $2, $3) RETURNING id_distribucio, nom_distribucio, descripcio_distribucio, plantilla_id, created_at',
            [nom_distribucio.trim(), descripcio_distribucio || null, parseInt(plantilla_id)]
        );
        const novaDistribucio = distribucioRes.rows[0];

        if (assignacions.length > 0) {
            const placementValues = [];
            const queryParams = [];
            let paramCounter = 1;

            for (const assignacio of assignacions) {
                if (assignacio.alumne_id === undefined || assignacio.taula_plantilla_id === undefined) {
                    await db.pool.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: `L'assignació per a l'alumne ${assignacio.alumne_id || 'desconegut'} no té ID d'alumne o de taula.` });
                }
                placementValues.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
                queryParams.push(novaDistribucio.id_distribucio);
                queryParams.push(assignacio.alumne_id);
                // Permetem taula_plantilla_id null per si un alumne està al "pool" dins una distribució
                queryParams.push(assignacio.taula_plantilla_id === null ? null : parseInt(assignacio.taula_plantilla_id));
            }

            // Important: ON CONFLICT per si s'intenta desar una assignació per a un alumne que ja té una en aquesta distribució (si és el cas, s'actualitza)
            // Això és útil si es desa una distribució modificada sobre una existent amb el mateix nom (encara que aquí estem creant una nova distribució amb nou ID)
            // Per a una nova distribució, el ON CONFLICT (id_distribucio, alumne_id) no hauria d'activar-se si els alumnes són únics dins les 'assignacions' rebudes.
            // La constraint UNIQUE (distribucio_id, alumne_id) a la BD s'encarregarà de les violacions.
            const assignacionsQuery = `
                INSERT INTO distribucio_assignacions (distribucio_id, alumne_id, taula_plantilla_id) 
                VALUES ${placementValues.join(', ')}
                RETURNING alumne_id, taula_plantilla_id`;

            const assignacionsRes = await db.query(assignacionsQuery, queryParams);
            novaDistribucio.assignacions = assignacionsRes.rows;
        } else {
            novaDistribucio.assignacions = [];
        }

        await db.pool.query('COMMIT');
        res.status(201).json({ success: true, distribucio: novaDistribucio });

    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error('Error desant la distribució:', error);
        if (error.code === '23503') { // Foreign key violation
            let userMessage = 'Error de dades: ';
            if (error.constraint && error.constraint.includes('plantilla_id')) {
                userMessage += 'La plantilla d\'aula especificada no existeix.';
            } else if (error.constraint && error.constraint.includes('alumne_id')) {
                userMessage += 'Un dels alumnes especificats no existeix.';
            } else if (error.constraint && error.constraint.includes('taula_plantilla_id')) {
                userMessage += 'Una de les taules de plantilla especificades no existeix.';
            } else {
                userMessage += 'Alguna de les referències (plantilla, alumne o taula) no és vàlida.';
            }
            return res.status(400).json({ success: false, message: userMessage, error: error.detail || error.message });
        }
        if (error.code === '23505' && error.constraint === 'uq_distribucio_alumne') {
             return res.status(409).json({ success: false, message: 'Un alumne no pot estar assignat a més d\'una taula en la mateixa distribució.', error: error.detail || error.message });
        }
        res.status(500).json({ success: false, message: 'Error intern del servidor desant la distribució.', error: error.message });
    }
};

// Obtenir totes les distribucions (opcionalment filtrades per plantilla_id)
const getAllDistribucions = async (req, res) => {
    const { plantilla_id } = req.query; // Permet filtrar per plantilla: /api/distribucions?plantilla_id=X
    try {
        let query = 'SELECT id_distribucio, nom_distribucio, descripcio_distribucio, plantilla_id, created_at FROM distribucions';
        const params = [];
        if (plantilla_id) {
            query += ' WHERE plantilla_id = $1';
            params.push(plantilla_id);
        }
        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json({ success: true, distribucions: result.rows });
    } catch (error) {
        console.error('Error obtenint totes les distribucions:', error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Obtenir una distribució específica (amb les seves assignacions)
const getDistribucioById = async (req, res) => {
    const { id_distribucio } = req.params;
    try {
        const distribucioRes = await db.query(
            'SELECT id_distribucio, nom_distribucio, descripcio_distribucio, plantilla_id, created_at FROM distribucions WHERE id_distribucio = $1',
            [id_distribucio]
        );
        if (distribucioRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Distribució no trobada.' });
        }
        const distribucio = distribucioRes.rows[0];

        const assignacionsRes = await db.query(
            'SELECT alumne_id, taula_plantilla_id FROM distribucio_assignacions WHERE distribucio_id = $1',
            [id_distribucio]
        );

        // Per cada assignació, voldrem també els detalls de l'alumne i la taula
        const assignacionsDetallades = [];
        for (const assignacio of assignacionsRes.rows) {
            const alumneRes = await db.query('SELECT id, name, academic_grade, gender FROM students WHERE id = $1', [assignacio.alumne_id]);
            const taulaRes = assignacio.taula_plantilla_id 
                ? await db.query('SELECT id_taula_plantilla, identificador_taula_dins_plantilla, capacitat FROM taules_plantilla WHERE id_taula_plantilla = $1', [assignacio.taula_plantilla_id])
                : { rows: [{ id_taula_plantilla: null, identificador_taula_dins_plantilla: 'Pool', capacitat: Infinity }] }; // Alumne al pool

            if (alumneRes.rows.length > 0) { // Només afegim si l'alumne encara existeix
                 assignacionsDetallades.push({
                    alumne: alumneRes.rows[0],
                    taula: taulaRes.rows[0] || { id_taula_plantilla: assignacio.taula_plantilla_id } // fallback si la taula no es trobés
                });
            }
        }
        distribucio.assignacionsDetallades = assignacionsDetallades;
        // També retornem les assignacions simples per si el frontend les prefereix per actualitzar l'estat
        distribucio.assignacions = assignacionsRes.rows.map(a => ({ alumne_id: a.alumne_id, taula_plantilla_id: a.taula_plantilla_id }));


        res.json({ success: true, distribucio });
    } catch (error) {
        console.error(`Error obtenint la distribució ${id_distribucio}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// Esborrar una distribució
const deleteDistribucio = async (req, res) => {
    const { id_distribucio } = req.params;
    try {
        const result = await db.query(
            'DELETE FROM distribucions WHERE id_distribucio = $1 RETURNING id_distribucio', 
            [id_distribucio]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Distribució no trobada per esborrar.' });
        }
        res.json({ success: true, message: `Distribució ${id_distribucio} esborrada correctament.` });
    } catch (error) {
        console.error(`Error esborrant la distribució ${id_distribucio}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

// (Opcional) Actualitzar una distribució (nom, descripció, o fins i tot les assignacions)
// Això seria més complex si es volen actualitzar assignacions parcialment.
// Per ara, esborrar i tornar a crear una distribució amb el mateix nom podria ser una alternativa.

module.exports = {
    saveDistribucio,
    getAllDistribucions,
    getDistribucioById,
    deleteDistribucio,
};