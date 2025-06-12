# Funcionalitat d'Exportació de Distribucions

Aquesta funcionalitat permet exportar les distribucions d'alumnes que s'estan visualitzant en diferents formats per facilitar la compartició, arxiu i anàlisi de les assignacions.

## Funcionalitats Implementades

### 1. Formats d'Exportació Disponibles

#### CSV (Comma Separated Values)
- **Format**: Fitxer de text amb valors separats per comes
- **Contingut**: Llista dels alumnes amb la seva informació bàsica i assignació de taula
- **Ús recomanat**: Importació a altres sistemes o anàlisi de dades simple

#### Excel (.xlsx)
- **Format**: Full de càlcul de Microsoft Excel amb múltiples pestanyes
- **Contingut**: 
  - **Pestanya "Resum"**: Estadístiques generals de la distribució
  - **Pestanya "Detall Alumnes"**: Informació completa de cada alumne
  - **Pestanya "Per Taules"**: Vista organitzada per taules amb els alumnes assignats
- **Ús recomanat**: Anàlisi detallada, presentacions i informes

#### Resum de Text (.txt)
- **Format**: Fitxer de text pla amb estadístiques
- **Contingut**: Resum executiu amb estadístiques clau
- **Ús recomanat**: Revisió ràpida i documentació

### 2. Informació Inclosa en les Exportacions

Cada exportació inclou la següent informació per alumne:
- **Nom de l'alumne**
- **Nota acadèmica** (si està disponible)
- **Gènere** (en format llegible: Masculí, Femení, etc.)
- **Classe** a la qual pertany l'alumne
- **Taula assignada** (o "Pool" si no està assignat)
- **Capacitat de la taula**

### 3. Estadístiques Incloses

Les exportacions en format Excel i Resum inclouen:

#### Estadístiques per Taula
- Nombre d'alumnes assignats a cada taula
- Capacitat total de cada taula
- Percentatge d'ocupació

#### Distribució de Gèneres
- Nombre i percentatge d'alumnes per gènere
- Equilibri de gènere en la distribució

#### Distribució de Notes
- Nota mitjana de la distribució
- Notes mínima i màxima
- Nombre d'alumnes amb notes disponibles

## Com Utilitzar l'Exportació

### Des de la Interfície d'Usuari

1. **Carrega o crea una distribució** a la pàgina "Distribució d'alumnes"
2. **Localitza el botó "Exportar"** que apareix:
   - A la secció "Distribució desada" quan tens una distribució carregada
   - A la secció "Exportar distribució" quan estàs treballant amb una distribució actual
3. **Fes clic al botó "Exportar"** per obrir el menú de formats
4. **Selecciona el format desitjat**:
   - CSV per a dades simples
   - Excel per a anàlisi detallada  
   - Resum (TXT) per a estadístiques ràpides
5. **El fitxer es descarregarà automàticament**

### Ubicació del Botó d'Exportació

El botó d'exportació apareix en dues ubicacions principals:

1. **Secció de distribucions desades**: Quan tens una distribució carregada
2. **Secció d'exportació**: Per a la distribució actual que estàs visualitzant

El botó només està actiu quan:
- Hi ha una distribució carregada o alumnes assignats
- Les dades necessàries estan disponibles
- No hi ha cap procés d'exportació en curs

## Implementació Tècnica

### Fitxers Creats

#### `frontend/src/utils/exportUtils.js`
Conté totes les funcions d'exportació:
- `exportDistributionToCSV()`: Exporta a format CSV
- `exportDistributionToExcel()`: Exporta a format Excel amb múltiples pestanyes
- `exportDistributionSummary()`: Exporta resum estadístic
- Funcions auxiliars per al processament de dades

#### `frontend/src/components/export/ExportDistributionButton.js`
Component React reutilitzable que proporciona:
- Interfície d'usuari per a l'exportació
- Menú desplegable amb opcions de format
- Gestió d'estats de càrrega
- Notificacions d'èxit i error

### Dependencies Afegides

- **xlsx**: Biblioteca per a la generació de fitxers Excel

```bash
npm install xlsx
```

### Integració amb l'Aplicació Existent

L'exportació s'ha integrat de manera no intrusiva:
- No modifica l'estructura de dades existent
- Utilitza les dades que ja estan carregades en memòria
- No afegeix càrrega addicional al backend
- És compatible amb totes les funcionalitats existents

## Exemples d'Ús

### Exemple de Fitxer CSV Generat

```csv
Nom Alumne,Nota Acadèmica,Gènere,Classe,Taula Assignada,Capacitat Taula
"Maria García",8.5,Femení,"1r ESO A","Taula A1",4
"Joan Pérez",7.2,Masculí,"1r ESO A","Taula A1",4
"Laura Martínez",9.1,Femení,"1r ESO B","Taula A2",4
"Pere López",6.8,Masculí,"1r ESO B","Pool (no assignat)","Sense límit"
```

### Exemple de Resum de Text Generat

```
RESUM DE LA DISTRIBUCIÓ: Matemàtiques 1r ESO
Data: 12/6/2025 14:30:25
Plantilla: Aula 101 - Configuració estàndard
Total alumnes: 24

ESTADÍSTIQUES PER TAULA:
Taula A1: 4/4 (100%)
Taula A2: 3/4 (75%)
Taula B1: 6/6 (100%)
Pool (no assignat): 11/Sense límit (0%)

DISTRIBUCIÓ DE GÈNERES:
Femení: 12 (50%)
Masculí: 12 (50%)

DISTRIBUCIÓ DE NOTES:
Nota mitjana: 7.85
Nota mínima: 5.2
Nota màxima: 9.8
Alumnes amb nota: 24/24
```

## Beneficis de la Funcionalitat

1. **Facilita la documentació**: Permet crear registres permanents de les distribucions
2. **Millora la comunicació**: Facilita compartir distribucions amb altres docents o administració
3. **Suporta l'anàlisi**: Proporciona dades estructurades per a anàlisis posteriors
4. **Augmenta la transparència**: Permet mostrar com s'han fet les assignacions
5. **Facilita l'arxiu**: Crea registres histórics de les distribucions utilitzades

## Futures Millores Possibles

1. **Exportació d'imatges**: Generar diagrames visuals de la distribució
2. **Exportació en PDF**: Crear informes formatejats per a impressió
3. **Exportació programada**: Automatitzar l'exportació periòdica
4. **Plantilles personalitzables**: Permetre personalitzar el format de les exportacions
5. **Integració amb calendari**: Associar exportacions amb dates específiques

## Troubleshooting

### El botó d'exportació no apareix
- Verifica que hi hagi alumnes assignats a taules
- Assegura't que hi ha una plantilla carregada
- Comprova que no hi ha errors a la consola del navegador

### Error durant l'exportació
- Verifica que el navegador permet descàrregues automàtiques
- Comprova l'espai disponible al disc
- Revisa la consola del navegador per a missatges d'error detallats

### Fitxers corromputs o buits
- Assegura't que hi ha dades disponibles per exportar
- Verifica que la distribució està correctament carregada
- Comprova la compatibilitat del navegador amb les funcions d'exportació
