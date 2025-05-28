// backend/src/controllers/distribucioController.js
const db = require('../db');

// Desar una nova distribució
const saveDistribucio = async (req, res) => {
    // AFEGIT selected_classes_ids
    const { nom_distribucio, descripcio_distribucio, plantilla_id, assignacions, selected_classes_ids } = req.body;

    if (!nom_distribucio || !nom_distribucio.trim()) {
        return res.status(400).json({ success: false, message: "El nom de la distribució és obligatori." });
    }
    if (plantilla_id === undefined || isNaN(parseInt(plantilla_id))) {
        return res.status(400).json({ success: false, message: "Falta l'ID de la plantilla d'aula." });
    }
    if (!assignacions || !Array.isArray(assignacions)) {
        return res.status(400).json({ success: false, message: "S'ha de proporcionar un array d'assignacions." });
    }
    // Validació per selected_classes_ids
    if (!selected_classes_ids || !Array.isArray(selected_classes_ids) || selected_classes_ids.some(isNaN)) {
        return res.status(400).json({ success: false, message: "S'ha de proporcionar un array d'IDs de classe seleccionades." });
    }


    try {
        await db.pool.query('BEGIN');

        const distribucioRes = await db.query(
            'INSERT INTO distribucions (nom_distribucio, descripcio_distribucio, plantilla_id) VALUES ($1, $2, $3) RETURNING id_distribucio, nom_distribucio, descripcio_distribucio, plantilla_id, created_at',
            [nom_distribucio.trim(), descripcio_distribucio || null, parseInt(plantilla_id)]
        );
        const novaDistribucio = distribucioRes.rows[0];

        // Desar assignacions d'alumnes
        if (assignacions.length > 0) {
            const placementValues = [];
            const queryParamsAssignacions = [];
            let paramCounterAssignacions = 1;

            for (const assignacio of assignacions) {
                 if (assignacio.alumne_id === undefined || assignacio.taula_plantilla_id === undefined) { // taula_plantilla_id pot ser null
                    await db.pool.query('ROLLBACK');
                    return res.status(400).json({ success: false, message: `L'assignació per a l'alumne ${assignacio.alumne_id || 'desconegut'} no té ID d'alumne o de taula.` });
                }
                placementValues.push(`($${paramCounterAssignacions++}, $${paramCounterAssignacions++}, $${paramCounterAssignacions++})`);
                queryParamsAssignacions.push(novaDistribucio.id_distribucio);
                queryParamsAssignacions.push(assignacio.alumne_id);
                queryParamsAssignacions.push(assignacio.taula_plantilla_id === null ? null : parseInt(assignacio.taula_plantilla_id));
            }
            const assignacionsQuery = `
                INSERT INTO distribucio_assignacions (distribucio_id, alumne_id, taula_plantilla_id) 
                VALUES ${placementValues.join(', ')}
                RETURNING alumne_id, taula_plantilla_id`;
            const assignacionsRes = await db.query(assignacionsQuery, queryParamsAssignacions);
            novaDistribucio.assignacions = assignacionsRes.rows;
        } else {
            novaDistribucio.assignacions = [];
        }

        // Desar classes seleccionades per a la distribució
        let savedSelectedClassIds = [];
        if (selected_classes_ids && selected_classes_ids.length > 0) {
            const filterValues = [];
            const queryParamsFilter = [];
            let paramCounterFilter = 1;
            for (const id_classe of selected_classes_ids) {
                filterValues.push(`($${paramCounterFilter++}, $${paramCounterFilter++})`);
                queryParamsFilter.push(novaDistribucio.id_distribucio);
                queryParamsFilter.push(parseInt(id_classe));
            }
            const filterQuery = `
                INSERT INTO distribucio_classes_filter (distribucio_id, id_classe)
                VALUES ${filterValues.join(', ')}
                RETURNING id_classe`;
            const filterRes = await db.query(filterQuery, queryParamsFilter);
            savedSelectedClassIds = filterRes.rows.map(r => r.id_classe);
        }
        novaDistribucio.selected_classes_ids = savedSelectedClassIds;


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
            } else if (error.constraint && error.constraint.includes('id_classe')) {
                userMessage += 'Una de les classes seleccionades per al filtre no existeix.';
            }
             else {
                userMessage += 'Alguna de les referències (plantilla, alumne, taula o classe) no és vàlida.';
            }
            return res.status(400).json({ success: false, message: userMessage, error: error.detail || error.message });
        }
        if (error.code === '23505' && error.constraint === 'uq_distribucio_alumne') {
             return res.status(409).json({ success: false, message: 'Un alumne no pot estar assignat a més d\'una taula en la mateixa distribució.', error: error.detail || error.message });
        }
        res.status(500).json({ success: false, message: 'Error intern del servidor desant la distribució.', error: error.message });
    }
};


// Obtenir una distribució específica
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

        // Obtenir assignacions
        const assignacionsRes = await db.query(
            `SELECT da.alumne_id, da.taula_plantilla_id, s.name as student_name, s.academic_grade, s.gender, cl.nom_classe as student_class_name,
                    tp.identificador_taula_dins_plantilla as table_name, tp.capacitat as table_capacity
             FROM distribucio_assignacions da
             JOIN students s ON da.alumne_id = s.id
             LEFT JOIN classes cl ON s.id_classe_alumne = cl.id_classe
             LEFT JOIN taules_plantilla tp ON da.taula_plantilla_id = tp.id_taula_plantilla
             WHERE da.distribucio_id = $1`,
            [id_distribucio]
        );
        
        distribucio.assignacions = assignacionsRes.rows.map(a => ({ 
            alumne_id: a.alumne_id, 
            taula_plantilla_id: a.taula_plantilla_id 
        }));
        
        distribucio.assignacionsDetallades = assignacionsRes.rows.map(a => ({
            alumne: { 
                id: a.alumne_id, 
                name: a.student_name, 
                academic_grade: a.academic_grade, 
                gender: a.gender,
                class_name: a.student_class_name
            },
            taula: a.taula_plantilla_id ? { 
                id_taula_plantilla: a.taula_plantilla_id,
                identificador_taula_dins_plantilla: a.table_name,
                capacitat: a.table_capacity
            } : { id_taula_plantilla: null, identificador_taula_dins_plantilla: 'Pool', capacitat: Infinity }
        }));

        // Obtenir classes filtrades per a aquesta distribució
        const filterRes = await db.query(
            `SELECT dcf.id_classe, c.nom_classe 
             FROM distribucio_classes_filter dcf
             JOIN classes c ON dcf.id_classe = c.id_classe
             WHERE dcf.distribucio_id = $1`,
            [id_distribucio]
        );
        distribucio.selected_classes = filterRes.rows.map(r => ({ id_classe: r.id_classe, nom_classe: r.nom_classe }));
        distribucio.selected_classes_ids = filterRes.rows.map(r => r.id_classe);


        res.json({ success: true, distribucio });
    } catch (error) {
        console.error(`Error obtenint la distribució ${id_distribucio}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};


// getAllDistribucions i deleteDistribucio no necessiten canvis directes per aquesta funcionalitat.
const getAllDistribucions = async (req, res) => {
    const { plantilla_id } = req.query;
    try {
        let query = `
            SELECT d.id_distribucio, d.nom_distribucio, d.descripcio_distribucio, d.plantilla_id, d.created_at,
                   COALESCE(json_agg(DISTINCT jsonb_build_object('id_classe', c.id_classe, 'nom_classe', c.nom_classe)) FILTER (WHERE c.id_classe IS NOT NULL), '[]'::json) as filtered_classes
            FROM distribucions d
            LEFT JOIN distribucio_classes_filter dcf ON d.id_distribucio = dcf.distribucio_id
            LEFT JOIN classes c ON dcf.id_classe = c.id_classe
        `;
        const params = [];
        let whereClauseAdded = false;

        if (plantilla_id) {
            query += ' WHERE d.plantilla_id = $1';
            params.push(plantilla_id);
            whereClauseAdded = true;
        }
        
        query += ' GROUP BY d.id_distribucio ORDER BY d.created_at DESC';

        const result = await db.query(query, params);
        res.json({ success: true, distribucions: result.rows });
    } catch (error) {
        console.error('Error obtenint totes les distribucions:', error);
        res.status(500).json({ success: false, message: 'Error intern del servidor.', error: error.message });
    }
};

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


module.exports = {
    saveDistribucio,
    getAllDistribucions,
    getDistribucioById,
    deleteDistribucio,
};