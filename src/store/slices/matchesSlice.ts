import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Match, PlayoffType } from '../../types';
import { MATCHES } from '../../constants/matches';

interface MatchesState {
    matches: Match[];
    isAdmin: boolean;
}

// Helper function to check if a match is in the past
const isPastMatch = (matchDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
    const date = new Date(matchDate);
    return date < today;
};

// Sort matches function - keeps upcoming matches first (sorted by date ascending)
// and completed matches after (sorted by date descending - most recent first)
const sortMatches = (matches: Match[]): Match[] => {
    const upcomingMatches = matches
        .filter(match => match.status !== 'completed')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const completedMatches = matches
        .filter(match => match.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return [...upcomingMatches, ...completedMatches];
};

// Mark matches as completed if they are in the past
const processMatchesDates = (matches: Match[]): Match[] => {
    const processedMatches = matches.map(match => ({
        ...match,
        isPlayoff: match.teamA === 'Qualifier 1' || match.teamA === 'Eliminator' ||
            match.teamA === 'Qualifier 2' || match.teamA === 'Final',
        playoffType: (match.teamA === 'Qualifier 1' || match.teamA === 'Qualifier 2' ||
            match.teamA === 'Eliminator' || match.teamA === 'Final') ? match.teamA as PlayoffType : undefined,
        status: match.status || (isPastMatch(match.date) ? 'completed' : 'upcoming')
    }));

    return sortMatches(processedMatches);
};

const initialState: MatchesState = {
    matches: processMatchesDates(MATCHES),
    isAdmin: false
};

const matchesSlice = createSlice({
    name: 'matches',
    initialState,
    reducers: {
        setAdmin: (state, action: PayloadAction<boolean>) => {
            state.isAdmin = action.payload;
        },
        resetAdmin: (state) => {
            state.isAdmin = false;
        },
        updatePlayoffTeams: (state, action: PayloadAction<{
            matchId: string;
            teamA?: string;
            teamB?: string;
        }>) => {
            const match = state.matches.find(m => m.id === action.payload.matchId);
            if (match && match.isPlayoff && state.isAdmin) {
                if (action.payload.teamA) match.teamA = action.payload.teamA;
                if (action.payload.teamB) match.teamB = action.payload.teamB;
                match.adminUpdated = true;
            }
        },
        addMatch: (state, action: PayloadAction<Match>) => {
            if (state.isAdmin) {
                // Process the new match to check if it's in the past
                const processedMatch = processMatchesDates([action.payload])[0];
                state.matches.push(processedMatch);
                // Resort all matches
                state.matches = sortMatches(state.matches);
            }
        },
        updateMatch: (state, action: PayloadAction<Match>) => {
            if (state.isAdmin) {
                const index = state.matches.findIndex(match => match.id === action.payload.id);
                if (index !== -1) {
                    // Process the updated match to check if it's in the past
                    const processedMatch = processMatchesDates([action.payload])[0];
                    state.matches[index] = processedMatch;
                    // Resort all matches
                    state.matches = sortMatches(state.matches);
                }
            }
        },
        updateMatchStatus: (state, action: PayloadAction<{
            matchId: string;
            status: 'upcoming' | 'live' | 'completed'
        }>) => {
            if (state.isAdmin) {
                const match = state.matches.find(match => match.id === action.payload.matchId);
                if (match) {
                    match.status = action.payload.status;
                    // Resort all matches after status change
                    state.matches = sortMatches(state.matches);
                }
            }
        },
        deleteMatch: (state, action: PayloadAction<string>) => {
            if (state.isAdmin) {
                state.matches = state.matches.filter(match => match.id !== action.payload);
            }
        },
        // New reducer to check and update past matches status
        updatePastMatchesStatus: (state) => {
            state.matches = processMatchesDates(state.matches);
        }
    }
});

export const {
    setAdmin,
    resetAdmin,
    updatePlayoffTeams,
    addMatch,
    updateMatch,
    updateMatchStatus,
    deleteMatch,
    updatePastMatchesStatus
} = matchesSlice.actions;

export default matchesSlice.reducer; 