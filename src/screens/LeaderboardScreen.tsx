import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, DataTable, Badge, IconButton, ActivityIndicator } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchSheetData } from '../store/slices/googleSheetsSlice';
import { COLORS } from '../constants/colors';

// Extended Assignment interface to include additional fields
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

const LeaderboardScreen = () => {
    const dispatch = useAppDispatch();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const members = useAppSelector(state => state.members.members);
    const matches = useAppSelector(state => state.matches.matches);
    const assignments = useAppSelector(state => state.assignments.assignments) as ExtendedAssignment[];
    const playerScores = useAppSelector(state => state.playerScores.scores);
    const sheetMatches = useAppSelector(state => state.googleSheets.matches);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await dispatch(fetchSheetData()).unwrap();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Calculate winning matches for each member
    const membersWithWins = members.map(member => {
        let winCount = 0;

        // Check each completed match
        matches
            .filter(match => match.status === 'completed')
            .forEach(match => {
                const matchAssignments = assignments.filter(a => a.matchId === match.id);
                const sheetMatch = sheetMatches.find(m => m.id === match.id);

                // First try to get winner from Google Sheets data if available
                if (sheetMatch?.playerAssignments && sheetMatch.playerAssignments.length > 0 &&
                    (matchAssignments.length === 0 || playerScores.filter(s => s.matchId === match.id).length === 0)) {

                    // Calculate scores from sheet data
                    const membersWithScores = sheetMatch.playerAssignments
                        .map(pa => {
                            const p1Score = pa.p1Score || 0;
                            const p2Score = pa.p2Score || 0;
                            const calculatedTotal = p1Score + p2Score;
                            return {
                                member: pa.member,
                                total: calculatedTotal
                            };
                        })
                        .filter(pa => pa.total > 0);

                    if (membersWithScores.length > 0) {
                        const highestScore = Math.max(...membersWithScores.map(m => m.total));
                        // Check if this member won
                        const memberScore = membersWithScores.find(m =>
                            m.member.toLowerCase() === member.name.toLowerCase()
                        )?.total || 0;

                        if (memberScore === highestScore && highestScore > 0) {
                            winCount++;
                        }
                    }
                } else {
                    // Calculate from local data
                    const memberScores = new Map<string, number>();

                    matchAssignments.forEach(assignment => {
                        // Get player IDs
                        const player1Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                            ? `${assignment.teamPositionsFrom}${assignment.teamAChit}`
                            : `${match.teamA}${assignment.teamAChit}`;

                        const player2Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                            ? `${assignment.teamPositionsFrom}${assignment.teamBChit}`
                            : `${match.teamB}${assignment.teamBChit}`;

                        // Get scores for both players
                        const player1Score = playerScores.find(score =>
                            score.matchId === match.id && score.playerId === player1Id)?.runs ?? 0;
                        const player2Score = playerScores.find(score =>
                            score.matchId === match.id && score.playerId === player2Id)?.runs ?? 0;

                        // Calculate total score for this member
                        const totalScore = player1Score + player2Score;
                        memberScores.set(assignment.memberId, totalScore);
                    });

                    // Find highest score
                    let highestScore = -1;
                    memberScores.forEach((score) => {
                        if (score > highestScore) {
                            highestScore = score;
                        }
                    });

                    // Check if this member won or tied
                    const memberScore = memberScores.get(member.id) ?? 0;
                    if (memberScore === highestScore && highestScore > 0) {
                        winCount++;
                    }
                }
            });

        return {
            ...member,
            winCount
        };
    });

    // Sort members by win count (descending) and name (ascending)
    const sortedMembers = [...membersWithWins].sort((a, b) => {
        if (b.winCount !== a.winCount) {
            return b.winCount - a.winCount;
        }
        return a.name.localeCompare(b.name);
    });

    // Find maximum wins
    const maxWins = Math.max(...sortedMembers.map(m => m.winCount));

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Title
                    title="IPL Dream League Leaderboard"
                    right={(props) => (
                        isRefreshing ? (
                            <ActivityIndicator animating={true} color="#2196f3" style={{ marginRight: 16 }} />
                        ) : (
                            <IconButton
                                {...props}
                                icon="refresh"
                                onPress={handleRefresh}
                                mode="contained"
                                containerColor={COLORS.DARK}
                                iconColor={COLORS.WHITE}
                                style={styles.refreshButton}
                            />
                        )
                    )}
                />
                <Card.Content>
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title>Rank</DataTable.Title>
                            <DataTable.Title>Name</DataTable.Title>
                            <DataTable.Title numeric>Wins</DataTable.Title>
                            <DataTable.Title numeric>Profit/Loss</DataTable.Title>
                        </DataTable.Header>

                        {sortedMembers.map((member, index) => {
                            const totalInvestment = 2100; // 70 games × ₹30
                            const winnings = member.winCount * 210; // Each win gives ₹210
                            const profitLoss = winnings - totalInvestment;

                            return (
                                <DataTable.Row key={member.id}>
                                    <DataTable.Cell>{index + 1}</DataTable.Cell>
                                    <DataTable.Cell>
                                        <View style={styles.nameContainer}>
                                            <Text>{member.name}</Text>
                                            {member.winCount === maxWins && maxWins > 0 && (
                                                <Badge style={styles.leaderBadge}>👑</Badge>
                                            )}
                                        </View>
                                    </DataTable.Cell>
                                    <DataTable.Cell numeric>{member.winCount}</DataTable.Cell>
                                    <DataTable.Cell numeric>
                                        <Text style={{ color: profitLoss >= 0 ? 'green' : 'red' }}>
                                            ₹{profitLoss}
                                        </Text>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            );
                        })}
                    </DataTable>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Title title="How Wins are Calculated" />
                <Card.Content>
                    <Text>
                        • Each member's win count is the number of matches they've won.{'\n'}
                        • A win is achieved by having the highest total score in a match.{'\n'}
                        • Multiple members can win the same match if they tie for the highest score.{'\n'}
                        • Scores are based on the runs scored by players in batting positions assigned to members.{'\n'}
                        • Rajesh always gets the 8th position batsman from both teams.
                    </Text>
                </Card.Content>
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
    },
    card: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: COLORS.LIME,
        borderRadius: 0,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaderBadge: {
        backgroundColor: COLORS.DARK,
        color: COLORS.WHITE,
        marginLeft: 8,
        borderRadius: 0,
    },
    refreshButton: {
        margin: 8,
        borderRadius: 0,
    },
});

export default LeaderboardScreen; 