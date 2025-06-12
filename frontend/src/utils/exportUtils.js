// frontend/src/utils/exportUtils.js
import * as XLSX from 'xlsx';

/**
 * Exporta una distribució d'alumnes en format CSV
 * @param {Object} distribucio - Informació de la distribució
 * @param {Array} studentsData - Alumnes amb la seva assignació de taula
 * @param {Object} plantilla - Informació de la plantilla d'aula
 */
export const exportDistributionToCSV = (distribucio, studentsData, plantilla) => {
  const csvData = prepareDataForExport(distribucio, studentsData, plantilla);
  
  // Convertir les dades a format CSV
  const csvContent = [
    // Capçalera del CSV
    ['Nom Alumne', 'Nota Acadèmica', 'Gènere', 'Classe', 'Taula Assignada', 'Capacitat Taula'].join(','),
    // Dades dels alumnes
    ...csvData.map(row => [
      `"${row.studentName}"`,
      row.academicGrade || '',
      row.gender || '',
      `"${row.className}"`,
      `"${row.tableName}"`,
      row.tableCapacity || ''
    ].join(','))
  ].join('\n');

  // Crear i descarregar el fitxer
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const fileName = `distribucio_${distribucio.nom_distribucio}_${new Date().toISOString().split('T')[0]}.csv`;
  
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, fileName);
  } else {
    // Altres navegadors
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Exporta una distribució d'alumnes en format Excel
 * @param {Object} distribucio - Informació de la distribució
 * @param {Array} studentsData - Alumnes amb la seva assignació de taula
 * @param {Object} plantilla - Informació de la plantilla d'aula
 */
export const exportDistributionToExcel = (distribucio, studentsData, plantilla) => {
  const data = prepareDataForExport(distribucio, studentsData, plantilla);
  
  // Crear el workbook d'Excel
  const wb = XLSX.utils.book_new();
  
  // Full 1: Resum de la distribució
  const summaryData = [
    ['Informació de la Distribució'],
    ['Nom:', distribucio.nom_distribucio],
    ['Descripció:', distribucio.descripcio_distribucio || 'Sense descripció'],
    ['Plantilla:', plantilla.nom_plantilla],
    ['Data de creació:', new Date(distribucio.created_at).toLocaleString('ca-ES')],
    ['Total d\'alumnes:', data.length],
    ['Classes incloses:', [...new Set(data.map(d => d.className))].join(', ')],
    [],
    ['Resum per taula:'],
    ['Taula', 'Alumnes assignats', 'Capacitat', 'Ocupació (%)']
  ];

  // Estadístiques per taula
  const tableStats = getTableStatistics(data);
  tableStats.forEach(stat => {
    summaryData.push([stat.tableName, stat.studentsCount, stat.capacity, stat.occupancyPercentage + '%']);
  });

  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Resum');

  // Full 2: Detall dels alumnes
  const detailData = [
    ['Nom Alumne', 'Nota Acadèmica', 'Gènere', 'Classe', 'Taula Assignada', 'Capacitat Taula'],
    ...data.map(row => [
      row.studentName,
      row.academicGrade,
      row.gender,
      row.className,
      row.tableName,
      row.tableCapacity
    ])
  ];

  const detailWS = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, detailWS, 'Detall Alumnes');

  // Full 3: Alumnes per taula (vista diferent)
  const byTableData = [['Organització per Taules'], []];
  const tableGroups = groupStudentsByTable(data);
  
  Object.keys(tableGroups).sort().forEach(tableName => {
    byTableData.push([`${tableName} (${tableGroups[tableName].length}/${tableGroups[tableName][0]?.tableCapacity || 'N/A'})`]);
    tableGroups[tableName].forEach(student => {
      byTableData.push(['', student.studentName, student.academicGrade, student.gender, student.className]);
    });
    byTableData.push([]);
  });

  const byTableWS = XLSX.utils.aoa_to_sheet(byTableData);
  XLSX.utils.book_append_sheet(wb, byTableWS, 'Per Taules');

  // Descarregar el fitxer Excel
  const fileName = `distribucio_${distribucio.nom_distribucio}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Prepara les dades per a l'exportació
 */
const prepareDataForExport = (distribucio, studentsData, plantilla) => {
  return studentsData.map(student => ({
    studentName: student.name,
    academicGrade: student.academic_grade,
    gender: getGenderLabel(student.gender),
    className: student.class_name || 'Sense classe',
    tableName: getTableName(student.taula_plantilla_id, plantilla),
    tableCapacity: getTableCapacity(student.taula_plantilla_id, plantilla)
  }));
};

/**
 * Converteix el codi de gènere a text llegible
 */
const getGenderLabel = (gender) => {
  switch (gender) {
    case 'male': return 'Masculí';
    case 'female': return 'Femení';
    case 'other': return 'Altre';
    case 'prefer_not_to_say': return 'Prefereixo no dir-ho';
    default: return 'No especificat';
  }
};

/**
 * Obté el nom de la taula a partir de l'ID
 */
const getTableName = (taulaId, plantilla) => {
  if (!taulaId) return 'Pool (no assignat)';
  const taula = plantilla?.taules?.find(t => t.id_taula_plantilla === taulaId);
  return taula ? `Taula ${taula.identificador_taula_dins_plantilla}` : 'Taula desconeguda';
};

/**
 * Obté la capacitat de la taula a partir de l'ID
 */
const getTableCapacity = (taulaId, plantilla) => {
  if (!taulaId) return 'Sense límit';
  const taula = plantilla?.taules?.find(t => t.id_taula_plantilla === taulaId);
  return taula ? taula.capacitat : 'Desconeguda';
};

/**
 * Calcula estadístiques per taula
 */
const getTableStatistics = (data) => {
  const tableGroups = groupStudentsByTable(data);
  
  return Object.keys(tableGroups).sort().map(tableName => {
    const students = tableGroups[tableName];
    const capacity = students[0]?.tableCapacity === 'Sense límit' ? students.length : parseInt(students[0]?.tableCapacity) || 0;
    const occupancyPercentage = capacity > 0 ? Math.round((students.length / capacity) * 100) : 0;
    
    return {
      tableName,
      studentsCount: students.length,
      capacity: students[0]?.tableCapacity || 'N/A',
      occupancyPercentage
    };
  });
};

/**
 * Agrupa els alumnes per taula
 */
const groupStudentsByTable = (data) => {
  return data.reduce((groups, student) => {
    const tableName = student.tableName;
    if (!groups[tableName]) {
      groups[tableName] = [];
    }
    groups[tableName].push(student);
    return groups;
  }, {});
};

/**
 * Exporta un resum estadístic de la distribució
 */
export const exportDistributionSummary = (distribucio, studentsData, plantilla) => {
  const data = prepareDataForExport(distribucio, studentsData, plantilla);
  const tableStats = getTableStatistics(data);
  
  const summaryText = [
    `RESUM DE LA DISTRIBUCIÓ: ${distribucio.nom_distribucio}`,
    `Data: ${new Date().toLocaleString('ca-ES')}`,
    `Plantilla: ${plantilla.nom_plantilla}`,
    `Total alumnes: ${data.length}`,
    '',
    'ESTADÍSTIQUES PER TAULA:',
    ...tableStats.map(stat => 
      `${stat.tableName}: ${stat.studentsCount}/${stat.capacity} (${stat.occupancyPercentage}%)`
    ),
    '',
    'DISTRIBUCIÓ DE GÈNERES:',
    ...getGenderDistribution(data),
    '',
    'DISTRIBUCIÓ DE NOTES:',
    ...getGradeDistribution(data)
  ].join('\n');
  
  const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const fileName = `resum_distribucio_${distribucio.nom_distribucio}_${new Date().toISOString().split('T')[0]}.txt`;
  
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Calcula la distribució de gèneres
 */
const getGenderDistribution = (data) => {
  const genderCounts = data.reduce((counts, student) => {
    counts[student.gender] = (counts[student.gender] || 0) + 1;
    return counts;
  }, {});
  
  return Object.entries(genderCounts).map(([gender, count]) => 
    `${gender}: ${count} (${Math.round((count / data.length) * 100)}%)`
  );
};

/**
 * Calcula la distribució de notes
 */
const getGradeDistribution = (data) => {
  const grades = data.filter(d => d.academicGrade && !isNaN(d.academicGrade))
    .map(d => parseFloat(d.academicGrade));
  
  if (grades.length === 0) return ['No hi ha notes disponibles'];
  
  const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
  const min = Math.min(...grades);
  const max = Math.max(...grades);
  
  return [
    `Nota mitjana: ${average.toFixed(2)}`,
    `Nota mínima: ${min}`,
    `Nota màxima: ${max}`,
    `Alumnes amb nota: ${grades.length}/${data.length}`
  ];
};
