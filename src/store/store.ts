import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import matchesReducer from './slices/matchesSlice';
import teamsReducer from './slices/teamsSlice';
import membersReducer from './slices/membersSlice';
import assignmentsReducer from './slices/assignmentsSlice';
import playerScoresReducer from './slices/playerScoresSlice';
import googleSheetsReducer from './slices/googleSheetsSlice';
import userReducer from './slices/userSlice';

// Configuration for redux-persist
const matchesPersistConfig = {
    key: 'matches',
    storage: AsyncStorage,
    whitelist: ['isAdmin'] // only isAdmin will be persisted
};

// User persistence config
const userPersistConfig = {
    key: 'user',
    storage: AsyncStorage,
    whitelist: ['isAuthenticated', 'isAdmin', 'currentUser'] // persist auth state
};

// Create persisted reducers
const persistedMatchesReducer = persistReducer(matchesPersistConfig, matchesReducer);
const persistedUserReducer = persistReducer(userPersistConfig, userReducer);

export const store = configureStore({
    reducer: {
        matches: persistedMatchesReducer,
        teams: teamsReducer,
        members: membersReducer,
        assignments: assignmentsReducer,
        playerScores: playerScoresReducer,
        googleSheets: googleSheetsReducer,
        user: persistedUserReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Disable serializable check completely
            immutableCheck: false, // Also disable immutable check for better performance
        })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 