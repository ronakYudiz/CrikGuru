export interface Player {
    id: string;
    name: string;
    teamId: string;
}

export interface PlayerScore {
    id: string;
    matchId: string;
    playerId: string;
    runs: number | undefined;
}

export interface Team {
    id: string;
    name: string;
    shortName: string;
    players: Player[];
}

export type PlayoffType = 'Qualifier 1' | 'Eliminator' | 'Qualifier 2' | 'Final';

export interface Match {
    id: string;
    date: string;
    teamA: string;
    teamB: string;
    isPlayoff?: boolean;
    playoffType?: PlayoffType;
    status?: 'upcoming' | 'live' | 'completed';
    adminUpdated?: boolean;
}

export interface Chit {
    id: string;
    teamShortName: string;
    battingPosition: number; // 1-7
}

export interface Member {
    id: string;
    name: string;
    score: number;
}

export interface Assignment {
    id: string;
    matchId: string;
    memberId: string;
    teamAChit: number;
    teamBChit: number;
    score: number;
}

export interface AppState {
    teams: Team[];
    matches: Match[];
    members: Member[];
    assignments: Assignment[];
} 