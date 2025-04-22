import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
    isAuthenticated: boolean;
    isAdmin: boolean;
    error: string | null;
}

const initialState: UserState = {
    isAuthenticated: false,
    isAdmin: false,
    error: null
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        loginAsAdmin: (state, action: PayloadAction<{ code: string }>) => {
            if (action.payload.code === 'admin123') {
                state.isAuthenticated = true;
                state.isAdmin = true;
                state.error = null;
            } else {
                state.error = 'Invalid admin code';
            }
        },
        loginAsGuest: (state) => {
            state.isAuthenticated = true;
            state.isAdmin = false;
            state.error = null;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.isAdmin = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    }
});

export const { loginAsAdmin, loginAsGuest, logout, clearError } = userSlice.actions;
export default userSlice.reducer; 