// Demo d'ús de la funcionalitat d'exportació de distribucions
// Aquest fitxer mostra com utilitzar les utilitats d'exportació

import { 
  exportDistributionToCSV, 
  exportDistributionToExcel, 
  exportDistributionSummary 
} from '../utils/exportUtils';

// Exemple de dades d'una distribució
const exempleDistribucio = {
  nom_distribucio: "Distribució Matemàtiques 1r ESO",
  descripcio_distribucio: "Distribució per al primer trimestre",
  created_at: "2024-01-15T10:30:00.000Z"
};

// Exemple de dades d'alumnes amb assignacions
const exempleStudentsData = [
  {
    id: 1,
    name: "Maria García",
    academic_grade: 8.5,
    gender: "female",
    class_name: "1r ESO A",
    taula_plantilla_id: 1
  },
  {
    id: 2,
    name: "Joan Pérez",
    academic_grade: 7.2,
    gender: "male", 
    class_name: "1r ESO A",
    taula_plantilla_id: 1
  },
  {
    id: 3,
    name: "Laura Martínez",
    academic_grade: 9.1,
    gender: "female",
    class_name: "1r ESO B",
    taula_plantilla_id: 2
  },
  {
    id: 4,
    name: "Pere López",
    academic_grade: 6.8,
    gender: "male",
    class_name: "1r ESO B",
    taula_plantilla_id: null // Al pool, no assignat
  }
];

// Exemple de dades de plantilla d'aula
const exemplePlantilla = {
  nom_plantilla: "Aula 101 - Configuració estàndard",
  taules: [
    {
      id_taula_plantilla: 1,
      identificador_taula_dins_plantilla: "A1",
      capacitat: 4
    },
    {
      id_taula_plantilla: 2,
      identificador_taula_dins_plantilla: "A2", 
      capacitat: 4
    },
    {
      id_taula_plantilla: 3,
      identificador_taula_dins_plantilla: "B1",
      capacitat: 6
    }
  ]
};

// Funcions d'exemple per utilitzar l'exportació
export const exemples = {
  
  // Exportar a CSV
  exportarCSV: () => {
    exportDistributionToCSV(exempleDistribucio, exempleStudentsData, exemplePlantilla);
    console.log("Distribució exportada a CSV!");
  },

  // Exportar a Excel
  exportarExcel: () => {
    exportDistributionToExcel(exempleDistribucio, exempleStudentsData, exemplePlantilla);
    console.log("Distribució exportada a Excel amb múltiples pestanyes!");
  },

  // Exportar resum
  exportarResum: () => {
    exportDistributionSummary(exempleDistribucio, exempleStudentsData, exemplePlantilla);
    console.log("Resum de distribució exportat!");
  }
};

// Per utilitzar aquests exemples des de la consola del navegador:
// 1. Obre les eines de desenvolupador (F12)
// 2. Navega a la pestanya Console
// 3. Escriu: exemples.exportarCSV() o exemples.exportarExcel() o exemples.exportarResum()
// 4. Premeu Enter per executar

window.exemplesExportacio = exemples;
