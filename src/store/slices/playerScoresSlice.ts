import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { PlayerScore } from '../../types';
import GoogleSheetsService, { ScoreUpdate } from '../../services/GoogleSheetsService';
import { fetchMatchData } from './googleSheetsSlice';

interface PlayerScoresState {
    scores: PlayerScore[];
    loading: boolean;
    error: string | null;
}

const initialState: PlayerScoresState = {
    scores: [],
    loading: false,
    error: null
};

const playerScoresSlice = createSlice({
    name: 'playerScores',
    initialState,
    reducers: {
        updatePlayerScores: (state, action: PayloadAction<PlayerScore[]>) => {
            // Remove existing scores for these players in this match
            const matchId = action.payload[0]?.matchId;
            if (matchId) {
                state.scores = state.scores.filter(score => score.matchId !== matchId);
            }
            // Add new scores
            state.scores.push(...action.payload);
        },
        clearScoreError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(updatePlayerScoresAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updatePlayerScoresAsync.fulfilled, (state, action) => {
                state.loading = false;
                // Remove existing scores for these players in this match
                const matchId = action.payload[0]?.matchId;
                if (matchId) {
                    state.scores = state.scores.filter(score => score.matchId !== matchId);
                }
                // Add new scores
                state.scores.push(...action.payload);
            })
            .addCase(updatePlayerScoresAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update scores';
            });
    }
});

export const { updatePlayerScores, clearScoreError } = playerScoresSlice.actions;

export const updatePlayerScoresAsync = createAsyncThunk(
    'playerScores/updatePlayerScoresAsync',
    async (scores: PlayerScore[], thunkAPI) => {
        try {
            // Group scores by match ID
            const scoresByMatch = scores.reduce((acc, score) => {
                if (!acc[score.matchId]) {
                    acc[score.matchId] = [];
                }

                // Only include scores that have an actual number value
                if (score.runs !== undefined) {
                    // Convert PlayerScore to ScoreUpdate
                    const scoreUpdate: ScoreUpdate = {
                        id: score.id,
                        matchId: score.matchId,
                        playerId: score.playerId,
                        runs: score.runs || 0 // Convert undefined to 0
                    };
                    acc[score.matchId].push(scoreUpdate);
                }

                return acc;
            }, {} as Record<string, ScoreUpdate[]>);

            // Update Google Sheets for each match
            const updatePromises = Object.entries(scoresByMatch).map(async ([matchId, matchScores]) => {
                console.log(`Updating Google Sheets for match ${matchId} with ${matchScores.length} score(s)`);
                return GoogleSheetsService.updatePlayerScores(matchId, matchScores);
            });

            // Wait for all updates to complete
            await Promise.all(updatePromises);

            // After successful update to Google Sheets, refresh the match data for all matches that were updated
            const refreshPromises = Object.keys(scoresByMatch).map(async (matchId) => {
                try {
                    // Add a longer delay to ensure Google Sheets has processed any updates
                    // This also helps with throttling by spacing out refreshes
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Force a refresh of match data from Google Sheets
                    // The fetchMatchData thunk will handle throttling internally
                    try {
                        const fetchAction = await thunkAPI.dispatch(fetchMatchData(matchId));
                        if (fetchMatchData.fulfilled.match(fetchAction)) {
                            console.log(`Successfully refreshed match ${matchId} data after score update`);
                        } else if (fetchAction.payload === 'Fetching too frequently') {
                            console.log(`Skipped refresh for match ${matchId} due to throttling`);
                            // Not an error, just throttled
                        } else {
                            console.error(`Failed to refresh match ${matchId} data after score update`);
                        }
                    } catch (fetchError) {
                        console.error(`Error dispatching fetch for match ${matchId}:`, fetchError);
                    }
                } catch (refreshError) {
                    console.error(`Error refreshing match ${matchId} data:`, refreshError);
                }
            });

            // Wait for all refreshes to complete
            await Promise.all(refreshPromises);

            // Continue with the Redux update
            return scores;
        } catch (error) {
            console.error('Error updating player scores in Google Sheets:', error);
            // Continue with the Redux update even if Google Sheets update fails
            return thunkAPI.rejectWithValue('Failed to update scores in spreadsheet');
        }
    }
);

export default playerScoresSlice.reducer; 