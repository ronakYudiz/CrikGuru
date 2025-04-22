import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Assignment } from '../../types';
import GoogleSheetsService from '../../services/GoogleSheetsService';

interface AssignmentsState {
    assignments: Assignment[];
    loading: boolean;
    error: string | null;
}

const initialState: AssignmentsState = {
    assignments: [],
    loading: false,
    error: null
};

export const createAssignmentAsync = createAsyncThunk(
    'assignments/createAssignmentAsync',
    async (assignment: Omit<Assignment, 'id'>, thunkAPI) => {
        try {
            // Generate a new ID for the assignment
            const newAssignment: Assignment = {
                ...assignment,
                id: `assignment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            };

            // Get member name from the store
            const state = thunkAPI.getState() as { members: { members: { id: string, name: string }[] } };
            const member = state.members.members.find(m => m.id === assignment.memberId);

            if (member) {
                // Get the team information from the match
                const matchesState = thunkAPI.getState() as {
                    matches: { matches: { id: string, teamA: string, teamB: string }[] }
                };
                const match = matchesState.matches.matches.find(m => m.id === assignment.matchId);

                if (match) {
                    // Handle assignment with bothFromSameTeam flag if it exists in the extended assignment
                    const extendedAssignment = assignment as any; // Cast to access potential additional properties
                    if (extendedAssignment.bothFromSameTeam && extendedAssignment.teamPositionsFrom) {
                        // Both positions are from the same team
                        const teamCode = extendedAssignment.teamPositionsFrom;
                        const p1Position = `${teamCode}${assignment.teamAChit}`;
                        const p2Position = `${teamCode}${assignment.teamBChit}`;

                        console.log(`Creating same-team assignment for ${member.name}: P1=${p1Position}, P2=${p2Position}`);

                        // Update Google Sheets
                        await GoogleSheetsService.updatePlayerAssignments(
                            assignment.matchId,
                            member.name,
                            p1Position,
                            p2Position
                        );
                    } else {
                        // Positions are from different teams
                        const p1Position = `${match.teamA}${assignment.teamAChit}`;
                        const p2Position = `${match.teamB}${assignment.teamBChit}`;

                        console.log(`Creating different-team assignment for ${member.name}: P1=${p1Position}, P2=${p2Position}`);

                        // Update Google Sheets
                        await GoogleSheetsService.updatePlayerAssignments(
                            assignment.matchId,
                            member.name,
                            p1Position,
                            p2Position
                        );
                    }
                }
            }

            return newAssignment;
        } catch (error) {
            console.error('Error creating assignment with Google Sheets update:', error);
            // Continue with Redux update even if Google Sheets update fails
            const newAssignment: Assignment = {
                ...assignment,
                id: `assignment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            };
            return newAssignment;
        }
    }
);

export const updateAssignmentAsync = createAsyncThunk(
    'assignments/updateAssignmentAsync',
    async (assignment: Assignment, thunkAPI) => {
        try {
            // Get member name from the store
            const state = thunkAPI.getState() as { members: { members: { id: string, name: string }[] } };
            const member = state.members.members.find(m => m.id === assignment.memberId);

            if (member) {
                // Get the team information from the match
                const matchesState = thunkAPI.getState() as {
                    matches: { matches: { id: string, teamA: string, teamB: string }[] }
                };
                const match = matchesState.matches.matches.find(m => m.id === assignment.matchId);

                if (match) {
                    // Handle assignment with bothFromSameTeam flag if it exists in the extended assignment
                    const extendedAssignment = assignment as any; // Cast to access potential additional properties
                    if (extendedAssignment.bothFromSameTeam && extendedAssignment.teamPositionsFrom) {
                        // Both positions are from the same team
                        const teamCode = extendedAssignment.teamPositionsFrom;
                        const p1Position = `${teamCode}${assignment.teamAChit}`;
                        const p2Position = `${teamCode}${assignment.teamBChit}`;

                        console.log(`Updating same-team assignment for ${member.name}: P1=${p1Position}, P2=${p2Position}`);

                        // Update Google Sheets
                        await GoogleSheetsService.updatePlayerAssignments(
                            assignment.matchId,
                            member.name,
                            p1Position,
                            p2Position
                        );
                    } else {
                        // Positions are from different teams
                        const p1Position = `${match.teamA}${assignment.teamAChit}`;
                        const p2Position = `${match.teamB}${assignment.teamBChit}`;

                        console.log(`Updating different-team assignment for ${member.name}: P1=${p1Position}, P2=${p2Position}`);

                        // Update Google Sheets
                        await GoogleSheetsService.updatePlayerAssignments(
                            assignment.matchId,
                            member.name,
                            p1Position,
                            p2Position
                        );
                    }
                }
            }

            return assignment;
        } catch (error) {
            console.error('Error updating assignment in Google Sheets:', error);
            // Continue with Redux update even if Google Sheets update fails
            return assignment;
        }
    }
);

export const deleteAssignmentAsync = createAsyncThunk(
    'assignments/deleteAssignmentAsync',
    async (data: { matchId: string; memberId: string }, thunkAPI) => {
        try {
            // Get member name from the store
            const state = thunkAPI.getState() as { members: { members: { id: string, name: string }[] } };
            const member = state.members.members.find(m => m.id === data.memberId);

            if (member) {
                console.log(`Deleting assignment for ${member.name} in match ${data.matchId}`);

                // Clear positions by passing empty strings
                // This will remove positions from Google Sheets
                await GoogleSheetsService.updatePlayerAssignments(
                    data.matchId,
                    member.name,
                    '',  // Empty string for position 1
                    ''   // Empty string for position 2
                );

                console.log(`Cleared positions for ${member.name} in match ${data.matchId}`);
            }

            return data;
        } catch (error) {
            console.error('Error deleting assignment from Google Sheets:', error);
            return data; // Continue with Redux update even if Google Sheets update fails
        }
    }
);

const assignmentsSlice = createSlice({
    name: 'assignments',
    initialState,
    reducers: {
        addAssignment: (state, action: PayloadAction<Assignment>) => {
            state.assignments.push(action.payload);
        },
        updateAssignment: (state, action: PayloadAction<Assignment>) => {
            const index = state.assignments.findIndex(
                assignment => assignment.matchId === action.payload.matchId &&
                    assignment.memberId === action.payload.memberId
            );
            if (index !== -1) {
                state.assignments[index] = action.payload;
            }
        },
        deleteAssignment: (state, action: PayloadAction<{ matchId: string; memberId: string }>) => {
            state.assignments = state.assignments.filter(
                assignment => !(assignment.matchId === action.payload.matchId &&
                    assignment.memberId === action.payload.memberId)
            );
        },
        clearAssignmentError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(createAssignmentAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createAssignmentAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.assignments.push(action.payload);
            })
            .addCase(createAssignmentAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create assignment';
            })
            .addCase(updateAssignmentAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateAssignmentAsync.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.assignments.findIndex(a => a.id === action.payload.id);
                if (index !== -1) {
                    state.assignments[index] = action.payload;
                }
            })
            .addCase(updateAssignmentAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update assignment';
            })
            .addCase(deleteAssignmentAsync.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteAssignmentAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.assignments = state.assignments.filter(
                    assignment => !(assignment.matchId === action.payload.matchId &&
                        assignment.memberId === action.payload.memberId)
                );
            })
            .addCase(deleteAssignmentAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to delete assignment';
            });
    }
});

export const { addAssignment, updateAssignment, deleteAssignment, clearAssignmentError } = assignmentsSlice.actions;
export default assignmentsSlice.reducer; 