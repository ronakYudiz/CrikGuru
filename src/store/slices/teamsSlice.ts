import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Team } from '../../types';
import { INITIAL_TEAMS } from '../../constants/initialData';

interface TeamsState {
    teams: Team[];
}

const initialState: TeamsState = {
    teams: INITIAL_TEAMS
};

const teamsSlice = createSlice({
    name: 'teams',
    initialState,
    reducers: {
        addTeam: (state, action: PayloadAction<Team>) => {
            state.teams.push(action.payload);
        },
        updateTeam: (state, action: PayloadAction<Team>) => {
            const index = state.teams.findIndex(team => team.id === action.payload.id);
            if (index !== -1) {
                state.teams[index] = action.payload;
            }
        },
        deleteTeam: (state, action: PayloadAction<string>) => {
            state.teams = state.teams.filter(team => team.id !== action.payload);
        }
    }
});

export const { addTeam, updateTeam, deleteTeam } = teamsSlice.actions;
export default teamsSlice.reducer; 