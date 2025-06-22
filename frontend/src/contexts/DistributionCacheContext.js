// frontend/src/contexts/DistributionCacheContext.js
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';

const DistributionCacheContext = createContext();

// Claus per sessionStorage
const CACHE_KEYS = {
  CURRENT_STATE: 'distribution_current_state',
  HISTORY: 'distribution_history',
  METADATA: 'distribution_metadata'
};

// Actions per al reducer
const ACTIONS = {
  LOAD_FROM_CACHE: 'LOAD_FROM_CACHE',
  SET_PLANTILLA: 'SET_PLANTILLA',
  SET_DISPLAYED_STUDENTS: 'SET_DISPLAYED_STUDENTS',
  SET_FILTER_CLASSES: 'SET_FILTER_CLASSES',
  SET_BALANCE_GENDER: 'SET_BALANCE_GENDER',
  SET_USE_PREFERENCES: 'SET_USE_PREFERENCES',
  SET_DISTRIBUCIO_INFO: 'SET_DISTRIBUCIO_INFO',
  SAVE_SNAPSHOT: 'SAVE_SNAPSHOT',
  UNDO: 'UNDO',
  REDO: 'REDO',
  CLEAR_CACHE: 'CLEAR_CACHE',
  LOAD_DISTRIBUCIO: 'LOAD_DISTRIBUCIO',
  DISTRIBUTION_SAVED: 'DISTRIBUTION_SAVED' // Nova acció
};

// Estat inicial
const initialState = {
  // Estat actual
  activePlantilla: null,
  selectedPlantillaId: '',
  displayedStudents: [],
  selectedFilterClasses: [],
  balanceByGender: false,
  usePreferences: true,
  activeDistribucioInfo: null,
  selectedDistribucioId: '',
  
  // Historial per desfer/refer
  history: [],
  currentHistoryIndex: -1,
  
  // Metadata
  lastSaved: null,
  isDirty: false
};

// Funció per validar i netejar dades del sessionStorage
const validateAndCleanStorageData = (data) => {
  if (!data || typeof data !== 'object') return null;
  
  return {
    ...data,
    selectedFilterClasses: Array.isArray(data.selectedFilterClasses) 
      ? data.selectedFilterClasses.filter(item => item && typeof item === 'object' && item.value !== undefined)
      : [],
    displayedStudents: Array.isArray(data.displayedStudents) 
      ? data.displayedStudents 
      : []
  };
};

// Reducer per gestionar l'estat
function distributionReducer(state, action) {
  switch (action.type) {    case ACTIONS.LOAD_FROM_CACHE: {
      const loadedState = action.payload.currentState || {};
      
      return {
        ...state,
        ...loadedState,
        // Validar que selectedFilterClasses sigui un array vàlid
        selectedFilterClasses: Array.isArray(loadedState.selectedFilterClasses) 
          ? loadedState.selectedFilterClasses.filter(item => item && typeof item === 'object' && item.value !== undefined)
          : [],
        // Validar que displayedStudents sigui un array vàlid
        displayedStudents: Array.isArray(loadedState.displayedStudents) 
          ? loadedState.displayedStudents 
          : [],
        history: action.payload.history || [],
        currentHistoryIndex: action.payload.metadata?.currentHistoryIndex ?? -1,
        lastSaved: action.payload.metadata?.lastSaved || null,
        isDirty: action.payload.metadata?.isDirty || false
      };
    }case ACTIONS.SET_PLANTILLA: {
      const newState = {
        ...state,
        activePlantilla: action.payload.plantilla,
        selectedPlantillaId: action.payload.plantillaId,
        // Reset altres camps quan canvia plantilla
        displayedStudents: [],
        selectedFilterClasses: [],
        activeDistribucioInfo: null,
        selectedDistribucioId: '',
        isDirty: false,
        // ESBORRAR HISTORIAL quan canvia plantilla
        history: [],
        currentHistoryIndex: -1
      };
      return newState;
    }

    case ACTIONS.SET_DISPLAYED_STUDENTS: {
      const newState = {
        ...state,
        displayedStudents: action.payload,
        isDirty: true
      };
      return newState;
    }    case ACTIONS.SET_FILTER_CLASSES: {
      // Validar que l'array sigui vàlid
      const validClasses = Array.isArray(action.payload) 
        ? action.payload.filter(item => item && typeof item === 'object' && item.value !== undefined)
        : [];
        
      const newState = {
        ...state,
        selectedFilterClasses: validClasses,
        isDirty: true
      };
      return newState;
    }

    case ACTIONS.SET_BALANCE_GENDER: {
      const newState = {
        ...state,
        balanceByGender: action.payload,
        isDirty: true
      };
      return newState;
    }

    case ACTIONS.SET_USE_PREFERENCES: {
      const newState = {
        ...state,
        usePreferences: action.payload,
        isDirty: true
      };
      return newState;
    }

    case ACTIONS.SET_DISTRIBUCIO_INFO: {
      const newState = {
        ...state,
        activeDistribucioInfo: action.payload.info,
        selectedDistribucioId: action.payload.id,
        isDirty: false
      };
      return newState;
    }

    case ACTIONS.SAVE_SNAPSHOT: {
      const snapshot = {
        timestamp: Date.now(),
        description: action.payload.description || 'Canvi automàtic',
        state: {
          displayedStudents: [...state.displayedStudents],
          selectedFilterClasses: [...state.selectedFilterClasses],
          balanceByGender: state.balanceByGender,
          usePreferences: state.usePreferences,
          activeDistribucioInfo: state.activeDistribucioInfo,
          selectedDistribucioId: state.selectedDistribucioId
        }
      };

      // Eliminar historial posterior si estem enmig de l'historial
      const newHistory = state.history.slice(0, state.currentHistoryIndex + 1);
      newHistory.push(snapshot);      // Mantenir només els últims 20 canvis (reduït de 50)
      const trimmedHistory = newHistory.slice(-20);

      return {
        ...state,
        history: trimmedHistory,
        currentHistoryIndex: trimmedHistory.length - 1,
        isDirty: true
      };
    }

    case ACTIONS.UNDO: {
      if (state.currentHistoryIndex > 0) {
        const previousIndex = state.currentHistoryIndex - 1;
        const previousState = state.history[previousIndex].state;
        
        return {
          ...state,
          ...previousState,
          currentHistoryIndex: previousIndex,
          isDirty: true
        };
      }
      return state;
    }

    case ACTIONS.REDO: {
      if (state.currentHistoryIndex < state.history.length - 1) {
        const nextIndex = state.currentHistoryIndex + 1;
        const nextState = state.history[nextIndex].state;
        
        return {
          ...state,
          ...nextState,
          currentHistoryIndex: nextIndex,
          isDirty: true
        };
      }
      return state;
    }

    case ACTIONS.LOAD_DISTRIBUCIO: {
      // Quan es carrega una distribució desada, es neteja l'historial i es crea un nou punt de partida
      const snapshot = {
        timestamp: Date.now(),
        description: `Distribució carregada: ${action.payload.info?.nom || 'Sense nom'}`,
        state: {
          displayedStudents: [...action.payload.displayedStudents],
          selectedFilterClasses: [...state.selectedFilterClasses],
          balanceByGender: state.balanceByGender,
          usePreferences: state.usePreferences,
          activeDistribucioInfo: action.payload.info,
          selectedDistribucioId: action.payload.id
        }
      };

      return {
        ...state,
        displayedStudents: action.payload.displayedStudents,
        activeDistribucioInfo: action.payload.info,
        selectedDistribucioId: action.payload.id,
        history: [snapshot],
        currentHistoryIndex: 0,
        isDirty: false
      };
    }    case ACTIONS.CLEAR_CACHE: {
      return {
        ...initialState,
        // Mantenir només la plantilla si s'especifica
        activePlantilla: action.payload?.keepPlantilla ? state.activePlantilla : null,
        selectedPlantillaId: action.payload?.keepPlantilla ? state.selectedPlantillaId : ''
      };
    }

    case ACTIONS.DISTRIBUTION_SAVED: {
      // Quan es guarda una distribució, netejar l'historial i marcar com no dirty
      return {
        ...state,
        activeDistribucioInfo: action.payload.info,
        selectedDistribucioId: action.payload.id,
        isDirty: false,
        lastSaved: Date.now(),
        // ESBORRAR HISTORIAL quan es guarda
        history: [],
        currentHistoryIndex: -1
      };
    }

    default:
      return state;
  }
}

// Hook per utilitzar el context
export const useDistributionCache = () => {
  const context = useContext(DistributionCacheContext);
  if (!context) {
    throw new Error('useDistributionCache must be used within a DistributionCacheProvider');
  }
  return context;
};

// Provider del context
export const DistributionCacheProvider = ({ children }) => {
  const [state, dispatch] = useReducer(distributionReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar des de sessionStorage quan s'inicialitza
  useEffect(() => {
    const loadFromStorage = () => {
      try {        const currentStateRaw = sessionStorage.getItem(CACHE_KEYS.CURRENT_STATE);
        const history = sessionStorage.getItem(CACHE_KEYS.HISTORY);
        const metadata = sessionStorage.getItem(CACHE_KEYS.METADATA);        if (currentStateRaw) {
          const parsedState = JSON.parse(currentStateRaw);
          const cleanState = validateAndCleanStorageData(parsedState);
          
          // Verificar que les dades netejades siguin vàlides
          if (cleanState && typeof cleanState === 'object') {
            dispatch({
              type: ACTIONS.LOAD_FROM_CACHE,
              payload: {
                currentState: cleanState,
                history: history ? JSON.parse(history) : [],
                metadata: metadata ? JSON.parse(metadata) : {}
              }
            });
          } else {
            console.warn('Dades del sessionStorage corruptes, netejant...');
            // Netejar sessionStorage si les dades estan corruptes
            sessionStorage.removeItem(CACHE_KEYS.CURRENT_STATE);
            sessionStorage.removeItem(CACHE_KEYS.HISTORY);
            sessionStorage.removeItem(CACHE_KEYS.METADATA);
          }
        }
      } catch (error) {
        console.error('Error loading distribution cache from sessionStorage:', error);
        // Netejar sessionStorage en cas d'error de parsing
        try {
          sessionStorage.removeItem(CACHE_KEYS.CURRENT_STATE);
          sessionStorage.removeItem(CACHE_KEYS.HISTORY);
          sessionStorage.removeItem(CACHE_KEYS.METADATA);
        } catch (cleanupError) {
          console.error('Error netejant sessionStorage:', cleanupError);
        }
      } finally {
        // Marcar com inicialitzat després de carregar
        setIsInitialized(true);
      }
    };

    loadFromStorage();
  }, []);
  // Guardar a sessionStorage quan canvia l'estat (només després d'inicialitzar)
  useEffect(() => {
    if (!isInitialized) return; // No guardar fins que s'hagi carregat l'estat inicial
      // Debounce per evitar múltiples escriptures (augmentat a 500ms)
    const saveTimeout = setTimeout(() => {
      try {
        const currentState = {
          activePlantilla: state.activePlantilla,
          selectedPlantillaId: state.selectedPlantillaId,
          displayedStudents: state.displayedStudents,
          selectedFilterClasses: state.selectedFilterClasses,
          balanceByGender: state.balanceByGender,
          usePreferences: state.usePreferences,
          activeDistribucioInfo: state.activeDistribucioInfo,
          selectedDistribucioId: state.selectedDistribucioId
        };

        const metadata = {
          currentHistoryIndex: state.currentHistoryIndex,
          lastSaved: state.lastSaved,
          isDirty: state.isDirty,
          lastUpdated: Date.now()
        };

        sessionStorage.setItem(CACHE_KEYS.CURRENT_STATE, JSON.stringify(currentState));
        sessionStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(state.history));
        sessionStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
      } catch (error) {
        console.error('Error saving distribution cache to sessionStorage:', error);
      }
    }, 300); // Augmentat a 300ms per millor rendiment

    return () => clearTimeout(saveTimeout);
  }, [state, isInitialized]);

  // Funcions d'acció
  const actions = {
    setPlantilla: (plantilla, plantillaId) => {
      dispatch({
        type: ACTIONS.SET_PLANTILLA,
        payload: { plantilla, plantillaId }
      });
    },

    setDisplayedStudents: (students) => {
      dispatch({
        type: ACTIONS.SET_DISPLAYED_STUDENTS,
        payload: students
      });
    },

    setFilterClasses: (classes) => {
      dispatch({
        type: ACTIONS.SET_FILTER_CLASSES,
        payload: classes
      });
    },

    setBalanceGender: (balance) => {
      dispatch({
        type: ACTIONS.SET_BALANCE_GENDER,
        payload: balance
      });
    },

    setUsePreferences: (usePrefs) => {
      dispatch({
        type: ACTIONS.SET_USE_PREFERENCES,
        payload: usePrefs
      });
    },

    setDistribucioInfo: (info, id) => {
      dispatch({
        type: ACTIONS.SET_DISTRIBUCIO_INFO,
        payload: { info, id }
      });
    },

    saveSnapshot: (description) => {
      dispatch({
        type: ACTIONS.SAVE_SNAPSHOT,
        payload: { description }
      });
    },

    undo: () => {
      dispatch({ type: ACTIONS.UNDO });
    },

    redo: () => {
      dispatch({ type: ACTIONS.REDO });
    },

    loadDistribucio: (displayedStudents, info, id) => {
      dispatch({
        type: ACTIONS.LOAD_DISTRIBUCIO,
        payload: { displayedStudents, info, id }
      });
    },    clearCache: (keepPlantilla = false) => {
      dispatch({
        type: ACTIONS.CLEAR_CACHE,
        payload: { keepPlantilla }
      });
      
      // Netejar sessionStorage
      sessionStorage.removeItem(CACHE_KEYS.CURRENT_STATE);
      sessionStorage.removeItem(CACHE_KEYS.HISTORY);
      sessionStorage.removeItem(CACHE_KEYS.METADATA);
    },

    distributionSaved: (info, id) => {
      dispatch({
        type: ACTIONS.DISTRIBUTION_SAVED,
        payload: { info, id }
      });
    },

    // Acció per netejar sessionStorage en cas d'errors
    clearCorruptedStorage: () => {
      try {
        sessionStorage.removeItem(CACHE_KEYS.CURRENT_STATE);
        sessionStorage.removeItem(CACHE_KEYS.HISTORY);
        sessionStorage.removeItem(CACHE_KEYS.METADATA);
        console.log('SessionStorage netejat per corrupció');
      } catch (error) {
        console.error('Error netejant sessionStorage:', error);
      }
    },

    // Getters per comprovar l'estat
    canUndo: () => state.currentHistoryIndex > 0,
    canRedo: () => state.currentHistoryIndex < state.history.length - 1,
    getHistoryInfo: () => ({
      current: state.currentHistoryIndex,
      total: state.history.length,
      canUndo: state.currentHistoryIndex > 0,
      canRedo: state.currentHistoryIndex < state.history.length - 1
    })
  };

  return (
    <DistributionCacheContext.Provider value={{ state, actions }}>
      {children}
    </DistributionCacheContext.Provider>
  );
};

export default DistributionCacheContext;
