import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import GoogleSheetsService, { MatchData, ScoreUpdate } from '../../services/GoogleSheetsService';

// Keep track of pending fetches to prevent duplicate requests
let fetchTimestamps: Record<string, number> = {};
const THROTTLE_INTERVAL = 5000; // Increase to 5 seconds

interface GoogleSheetsState {
    matches: MatchData[];
    currentMatch: MatchData | null;
    loading: boolean;
    error: string | null;
    lastFetchTime: number | null;
    fetchCount: number;
}

const initialState: GoogleSheetsState = {
    matches: [],
    currentMatch: null,
    loading: false,
    error: null,
    lastFetchTime: null,
    fetchCount: 0
};

export const fetchSheetData = createAsyncThunk(
    'googleSheets/fetchSheetData',
    async () => {
        try {
            const data = await GoogleSheetsService.getSheetData();
            const matches = GoogleSheetsService.mapSheetDataToMatches(data);
            return matches;
        } catch (error: any) {
            throw error;
        }
    }
);

export const fetchMatchData = createAsyncThunk(
    'googleSheets/fetchMatchData',
    async (matchId: string, { rejectWithValue }) => {
        try {
            // Check if we've fetched this match recently and prevent duplicates
            const now = Date.now();
            const lastFetchTime = fetchTimestamps[matchId] || 0;
            const timeSinceLastFetch = now - lastFetchTime;

            if (timeSinceLastFetch < THROTTLE_INTERVAL) {
                console.log(`Throttling fetch for match ${matchId} - last fetch was ${timeSinceLastFetch}ms ago`);
                return rejectWithValue('Fetching too frequently');
            }

            // Update fetch timestamp
            fetchTimestamps[matchId] = now;
            console.log(`Fetching match data for ${matchId} at timestamp ${now}`);

            const data = await GoogleSheetsService.getSheetData();
            const matches = GoogleSheetsService.mapSheetDataToMatches(data);
            const match = matches.find(m => m.id === matchId);

            if (!match) {
                throw new Error(`Match with ID ${matchId} not found`);
            }

            return match;
        } catch (error: any) {
            // Only rejectWithValue if it's not our throttling message
            if (error.message === 'Fetching too frequently') {
                return rejectWithValue('Fetching too frequently');
            }
            return rejectWithValue(error.message || 'Failed to fetch match data');
        }
    }
);

const googleSheetsSlice = createSlice({
    name: 'googleSheets',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch all data
            .addCase(fetchSheetData.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.fetchCount++;
            })
            .addCase(fetchSheetData.fulfilled, (state, action: PayloadAction<MatchData[]>) => {
                state.loading = false;
                state.matches = action.payload;
                state.lastFetchTime = Date.now();
            })
            .addCase(fetchSheetData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch sheet data';
            })

            // Fetch single match
            .addCase(fetchMatchData.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.fetchCount++;
            })
            .addCase(fetchMatchData.fulfilled, (state, action: PayloadAction<MatchData>) => {
                state.loading = false;
                state.currentMatch = action.payload;
                state.lastFetchTime = Date.now();

                // Also update the match in the matches array
                const matchIndex = state.matches.findIndex(match => match.id === action.payload.id);
                if (matchIndex !== -1) {
                    state.matches[matchIndex] = action.payload;
                } else {
                    // If the match doesn't exist in the array, add it
                    state.matches.push(action.payload);
                }
            })
            .addCase(fetchMatchData.rejected, (state, action) => {
                state.loading = false;

                // Only set error state if it's not a throttling message
                if (action.payload !== 'Fetching too frequently') {
                    state.error = action.payload as string || 'Failed to fetch match data';
                }
            });
    }
});

export const { clearError } = googleSheetsSlice.actions;
export default googleSheetsSlice.reducer; 