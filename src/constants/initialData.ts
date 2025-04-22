import { Team, Match, Member } from '../types';

export const INITIAL_TEAMS: Team[] = [
    { id: 'CSK', shortName: 'CSK', name: 'Chennai Super Kings', players: [] },
    { id: 'DC', shortName: 'DC', name: 'Delhi Capitals', players: [] },
    { id: 'GT', shortName: 'GT', name: 'Gujarat Titans', players: [] },
    { id: 'KKR', shortName: 'KKR', name: 'Kolkata Knight Riders', players: [] },
    { id: 'LSG', shortName: 'LSG', name: 'Lucknow Super Giants', players: [] },
    { id: 'MI', shortName: 'MI', name: 'Mumbai Indians', players: [] },
    { id: 'PBKS', shortName: 'PBKS', name: 'Punjab Kings', players: [] },
    { id: 'RCB', shortName: 'RCB', name: 'Royal Challengers Bangalore', players: [] },
    { id: 'RR', shortName: 'RR', name: 'Rajasthan Royals', players: [] },
    { id: 'SRH', shortName: 'SRH', name: 'Sunrisers Hyderabad', players: [] }
];

export const INITIAL_MATCHES: Match[] = [
    {
        id: '1',
        date: '2025-03-22',
        teamA: 'CSK',
        teamB: 'RCB',
        status: 'upcoming'
    },
    {
        id: '2',
        date: '2025-03-23',
        teamA: 'PBKS',
        teamB: 'DC',
        status: 'upcoming'
    },
    {
        id: '3',
        date: '2025-03-23',
        teamA: 'KKR',
        teamB: 'SRH',
        status: 'upcoming'
    },
    {
        id: '4',
        date: '2025-03-24',
        teamA: 'RR',
        teamB: 'LSG',
        status: 'upcoming'
    }
];

export const INITIAL_MEMBERS: Member[] = [
    { id: '1', name: 'Yamik', score: 0 },
    { id: '2', name: 'Ronak', score: 0 },
    { id: '3', name: 'Mahavir', score: 0 },
    { id: '4', name: 'Ravi', score: 0 },
    { id: '5', name: 'Vishal', score: 0 },
    { id: '6', name: 'Kishan', score: 0 },
    { id: '7', name: 'Tilak', score: 0 },
    { id: '8', name: 'Rajesh', score: 0 }
]; 