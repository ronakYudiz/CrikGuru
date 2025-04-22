import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Badge } from 'react-native-paper';
import { format } from 'date-fns';
import { useAppSelector } from '../store/hooks';
import { Match, Team } from '../types';
import { COLORS } from '../constants/colors';

// Extended Assignment interface for match winner calculation
interface ExtendedAssignment {
    id: string;
    matchId: string;
    memberId: string;
    teamAChit: number;
    teamBChit: number;
    score: number;
    bothFromSameTeam?: boolean;
    teamPositionsFrom?: string;
}

interface MatchCardProps {
    match: Match;
    teams: Team[];
    onPress: () => void;
}

const MatchCard = ({ match, teams, onPress }: MatchCardProps) => {
    const teamA = useMemo(() => teams.find(team => team.shortName === match.teamA), [teams, match.teamA]);
    const teamB = useMemo(() => teams.find(team => team.shortName === match.teamB), [teams, match.teamB]);
    const matchDate = new Date(match.date);
    const formattedDate = format(matchDate, 'MMM dd, yyyy');
    const isCompleted = match.status === 'completed';

    // Get assignments, members and scores to determine winner
    const assignments = useAppSelector(state =>
        state.assignments.assignments.filter(a => a.matchId === match.id)
        , (prev, next) => prev.length === next.length &&
            prev.every((a, i) => a.id === next[i].id)) as ExtendedAssignment[];

    const members = useAppSelector(state => state.members.members,
        (prev, next) => prev.length === next.length &&
            prev.every((m, i) => m.id === next[i].id));

    const playerScores = useAppSelector(state =>
        state.playerScores.scores.filter(score => score.matchId === match.id)
        , (prev, next) => prev.length === next.length &&
            prev.every((s, i) => s.id === next[i].id));

    // Get Google Sheets data for this match if available
    const sheetMatch = useAppSelector(state =>
        state.googleSheets.matches.find(m => m.id === match.id)
    );

    // Determine if match scoring is complete
    const isMatchComplete = useMemo(() => {
        // Check if there are assignments
        if (assignments.length === 0) return false;

        // Get all player IDs assigned in this match
        const playerIds: string[] = [];

        assignments.forEach(assignment => {
            // Player 1 ID
            const player1Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamAChit}`
                : `${match.teamA}${assignment.teamAChit}`;

            // Player 2 ID
            const player2Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamBChit}`
                : `${match.teamB}${assignment.teamBChit}`;

            playerIds.push(player1Id, player2Id);
        });

        // Check if all players have scores
        const allPlayersHaveScores = playerIds.every(playerId => {
            const score = playerScores.find(score => score.playerId === playerId);
            return score !== undefined && score.runs !== undefined && score.runs !== null;
        });

        // Debug log
        if (isCompleted) {
            console.log(`[MatchCard] Match ${match.id} complete check:`, {
                isCompleted,
                assignmentsCount: assignments.length,
                playerIdsCount: playerIds.length,
                scoresCount: playerScores.length,
                allPlayersHaveScores
            });
        }

        return allPlayersHaveScores;
    }, [assignments, playerScores, match.teamA, match.teamB, isCompleted, match.id]);

    // Calculate member scores and determine winners
    const winners = useMemo(() => {
        // Return empty array only if not completed
        if (!isCompleted) return [];

        // If we have sheet data with player assignments but no local assignments/scores,
        // we can use that data to determine winners
        if (sheetMatch?.playerAssignments && sheetMatch.playerAssignments.length > 0 &&
            (assignments.length === 0 || playerScores.length === 0)) {

            console.log(`Using Google Sheets data directly for match ${match.id}`);

            // Log all players and their scores from the sheet
            console.log(`All player scores from spreadsheet for match ${match.id}:`);
            sheetMatch.playerAssignments.forEach(pa => {
                // Calculate total manually to ensure accuracy
                const p1Score = pa.p1Score || 0;
                const p2Score = pa.p2Score || 0;
                const calculatedTotal = p1Score + p2Score;

                console.log(`${pa.member}: 
                  Position 1: ${pa.p1} (Score: ${pa.p1Score !== undefined ? pa.p1Score : 'not set'})
                  Position 2: ${pa.p2} (Score: ${pa.p2Score !== undefined ? pa.p2Score : 'not set'})
                  Spreadsheet Total: ${pa.total}
                  Calculated Total: ${calculatedTotal}`);
            });

            // Find member with highest total score - use CALCULATED total, not sheet total
            const membersWithScores = sheetMatch.playerAssignments
                .map(pa => {
                    // Calculate our own total instead of using pa.total
                    const p1Score = pa.p1Score || 0;
                    const p2Score = pa.p2Score || 0;
                    const calculatedTotal = p1Score + p2Score;

                    return {
                        ...pa,
                        calculatedTotal
                    };
                })
                .filter(pa => pa.calculatedTotal > 0)
                .sort((a, b) => b.calculatedTotal - a.calculatedTotal);

            console.log(`Sorted members by calculated scores:`,
                membersWithScores.map(m => `${m.member}: ${m.calculatedTotal}`));

            if (membersWithScores.length > 0) {
                const highestScore = membersWithScores[0].calculatedTotal;

                const winners = membersWithScores
                    .filter(member => member.calculatedTotal === highestScore)
                    .map(member => {
                        const memberId = members.find(m =>
                            m.name.toLowerCase() === member.member.toLowerCase()
                        )?.id || 'unknown';

                        return {
                            id: memberId,
                            name: member.member,
                            score: member.calculatedTotal
                        };
                    });

                console.log(`Direct sheet data winners for match ${match.id}:`, winners);

                if (winners.length > 0) {
                    return winners;
                }
            }
        }

        // Log all assignments and scores for this match if it's completed
        if (isCompleted) {
            console.log(`----- MATCH ${match.id} DETAILED DEBUG -----`);
            console.log(`Teams: ${match.teamA} vs ${match.teamB}`);
            console.log(`Assignments count: ${assignments.length}`);
            console.log(`Player scores count: ${playerScores.length}`);

            // Log all assignments with member names
            console.log("All member assignments:");
            assignments.forEach(assignment => {
                const member = members.find(m => m.id === assignment.memberId);

                // Get player IDs
                const player1Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                    ? `${assignment.teamPositionsFrom}${assignment.teamAChit}`
                    : `${match.teamA}${assignment.teamAChit}`;

                const player2Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                    ? `${assignment.teamPositionsFrom}${assignment.teamBChit}`
                    : `${match.teamB}${assignment.teamBChit}`;

                // Get player scores
                const player1Score = playerScores.find(score => score.playerId === player1Id)?.runs;
                const player2Score = playerScores.find(score => score.playerId === player2Id)?.runs;

                console.log(`- ${member?.name || 'Unknown Member'}: 
                    Position 1: ${player1Id} (Score: ${player1Score !== undefined ? player1Score : 'not set'})
                    Position 2: ${player2Id} (Score: ${player2Score !== undefined ? player2Score : 'not set'})
                    Total: ${(player1Score || 0) + (player2Score || 0)}`);
            });

            // Log all player scores
            console.log("All player scores in this match:");
            playerScores.forEach(score => {
                console.log(`- Player ${score.playerId}: ${score.runs !== undefined ? score.runs : 'score not set'}`);
            });
            console.log("--------------------------------------");
        }

        // Map to store member scores
        const memberScores = new Map<string, number>();

        // Calculate total score for each member
        assignments.forEach(assignment => {
            // Determine player IDs based on whether both are from the same team
            const player1Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamAChit}`
                : `${match.teamA}${assignment.teamAChit}`;

            const player2Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamBChit}`
                : `${match.teamB}${assignment.teamBChit}`;

            // Get scores for both players - default to 0 if no scores found
            const player1Score = playerScores.find(score => score.playerId === player1Id)?.runs ?? 0;
            const player2Score = playerScores.find(score => score.playerId === player2Id)?.runs ?? 0;

            // Calculate total score for this member
            const totalScore = player1Score + player2Score;

            // Add to member's total score
            const member = members.find(m => m.id === assignment.memberId);
            if (member) {
                const currentScore = memberScores.get(member.id) || 0;
                memberScores.set(member.id, currentScore + totalScore);
            }
        });

        // Log data for diagnosis
        console.log(`[MatchCard] Match ${match.id} score data:`, {
            assignmentsCount: assignments.length,
            memberScoresMapSize: memberScores.size,
            memberScores: Array.from(memberScores.entries())
        });

        // Find members with highest score
        let highestScore = -1; // Set to -1 to handle all zero scores
        const winnersList: { id: string; name: string; score: number }[] = [];

        // If we have no assignments or scores, at least return empty winners array
        if (memberScores.size === 0 && isCompleted) {
            console.log(`[MatchCard] No member scores for completed match ${match.id}`);
            return [];
        }

        memberScores.forEach((score, memberId) => {
            const member = members.find(m => m.id === memberId);
            if (member) {
                if (score > highestScore) {
                    highestScore = score;
                    winnersList.length = 0; // Clear previous winners
                    winnersList.push({ id: member.id, name: member.name, score });
                } else if (score === highestScore) {
                    winnersList.push({ id: member.id, name: member.name, score });
                }
            }
        });

        // Debug log
        if (isCompleted) {
            console.log(`[MatchCard] Match ${match.id} winners:`, {
                memberScoresCount: memberScores.size,
                highestScore,
                winnersCount: winnersList.length,
                winnersList
            });
        }

        return winnersList;
    }, [isCompleted, assignments, playerScores, members, match.teamA, match.teamB, match.id]);

    // Debug log for the actual rendering condition
    if (isCompleted) {
        console.log(`[MatchCard] Match ${match.id} render check:`, {
            isCompleted,
            winnersLength: winners.length,
            shouldDisplayWinner: isCompleted && winners.length > 0
        });
    }

    return (
        <Card style={styles.card} onPress={onPress}>
            <Card.Content>
                <View style={styles.dateContainer}>
                    <Text style={styles.date}>{formattedDate}</Text>
                    {isCompleted && (
                        <Badge style={styles.completedBadge}>COMPLETED</Badge>
                    )}
                </View>
                <View style={styles.teamsContainer}>
                    <Text style={styles.teamName}>{teamA?.name}</Text>
                    <Text style={styles.vs}>vs</Text>
                    <Text style={styles.teamName}>{teamB?.name}</Text>
                </View>
                {winners.length > 0 && (
                    <View style={styles.winnerContainer}>
                        <Badge style={styles.winnerBadge}>{winners.length > 1 ? 'TIE' : 'WINNER'}</Badge>
                        <Text style={styles.winnerName}>{winners.map(winner => winner.name).join(', ')}</Text>
                    </View>
                )}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
        elevation: 2,
        backgroundColor: COLORS.LIME,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    date: {
        fontSize: 16,
        color: COLORS.DARK,
    },
    completedBadge: {
        backgroundColor: COLORS.DARK,
        color: COLORS.WHITE,
        fontSize: 10,
    },
    teamsContainer: {
        alignItems: 'center',
        marginVertical: 8,
    },
    teamName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 4,
        color: COLORS.DARK,
    },
    vs: {
        fontSize: 16,
        color: COLORS.DARK,
        marginVertical: 4,
    },
    winnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    winnerBadge: {
        backgroundColor: COLORS.DARK,
        color: COLORS.WHITE,
        marginRight: 8,
    },
    winnerName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: COLORS.DARK,
    },
});

export default MatchCard; 