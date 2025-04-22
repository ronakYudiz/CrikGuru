import { RootState } from './store';

// Match selectors
export const selectAllMatches = (state: RootState) => state.matches.matches;
export const selectMatchById = (state: RootState, matchId: string) =>
    state.matches.matches.find(m => m.id === matchId);

// Assignment selectors
export const selectAllAssignments = (state: RootState) => state.assignments.assignments;
export const selectAssignmentsByMatch = (state: RootState, matchId: string) =>
    state.assignments.assignments.filter(a => a.matchId === matchId);
export const selectAssignmentByMatchAndMember = (state: RootState, matchId: string, memberId: string) =>
    state.assignments.assignments.find(a => a.matchId === matchId && a.memberId === memberId);

// Member selectors
export const selectAllMembers = (state: RootState) => state.members.members;
export const selectMemberById = (state: RootState, memberId: string) =>
    state.members.members.find(m => m.id === memberId);

// Team selectors
export const selectAllTeams = (state: RootState) => state.teams.teams;
export const selectTeamByShortName = (state: RootState, shortName: string) =>
    state.teams.teams.find(t => t.shortName === shortName);

// Score selectors
export const selectTotalScoreForMember = (state: RootState, memberId: string) =>
    state.assignments.assignments
        .filter(a => a.memberId === memberId)
        .reduce((total, a) => total + a.score, 0);

export const selectMemberScore = (state: RootState, matchId: string, memberId: string) => {
    const assignment = state.assignments.assignments.find(
        a => a.matchId === matchId && a.memberId === memberId
    );
    return assignment ? assignment.score : 0;
}; 