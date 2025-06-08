# Migració de Preferències Bidireccionals a Unidireccionals

Aquest document descriu els canvis realitzats al sistema de preferències d'alumnes, passant d'un model bidireccional a un model unidireccional.

## Resum de Canvis

1. **Canvi Conceptual**: Les preferències dels alumnes ara són unidireccionals. Si l'alumne A prefereix seure amb l'alumne B, això NO implica automàticament que B prefereixi seure amb A.

2. **Canvis en la Base de Dades**:
   - S'ha eliminat la restricció `check_different_students_preference` que obligava a ordenar els IDs
   - S'ha afegit una nova restricció `check_no_self_preference` per evitar que un alumne tingui preferència amb si mateix

3. **Canvis al Codi**:
   - S'han modificat les consultes SQL per considerar només les preferències en la direcció correcta
   - S'ha actualitzat la lògica d'inserció de preferències per mantenir la direccionalitat
   - S'ha adaptat l'algoritme d'assignació automàtica per considerar preferències en ambdues direccions de forma independent

## Instruccions de Migració

Per aplicar aquests canvis a un sistema existent, segueix aquests passos:

1. Atura el servidor backend
2. Aplica els canvis de restriccions a la base de dades:
   ```
   psql -f update_preferences_constraint.sql -U [usuari] -d [nom_base_dades]
   ```

3. Migra les dades existents al nou model:
   ```
   psql -f migrate_preferences_data.sql -U [usuari] -d [nom_base_dades]
   ```

4. Inicia el servidor backend amb el codi actualitzat

## Comportament Esperat

- **Frontend**: Els usuaris ara poden seleccionar alumnes que prefereixen, sense generar reciprocitat automàtica
- **Backend**: El sistema preserva la direccionalitat de les preferències
- **Algorisme**: Les preferències es consideren en ambdues direccions, donant més pes a les preferències recíproques

## Avantatges del Nou Model

- **Més Precisió**: Reflecteix millor les preferències reals dels alumnes
- **Més Flexibilitat**: Permet detectar preferències no correspostes
- **Millor Distribució**: L'algoritme considera tant les preferències emeses com rebudes
