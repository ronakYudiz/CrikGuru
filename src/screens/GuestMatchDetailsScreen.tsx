import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Divider, List, DataTable, Badge, Snackbar, Portal, Modal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useAppSelector, useAppDispatch } from '../store/hooks';

import { RootStackParamList } from '../navigation';
import { selectMatchById, selectTeamByShortName, selectAssignmentsByMatch } from '../store/selectors';
import { fetchMatchData } from '../store/slices/googleSheetsSlice';
import { updatePlayerScores } from '../store/slices/playerScoresSlice';
import { addAssignment, deleteAssignment, clearAssignmentError } from '../store/slices/assignmentsSlice';
import { COLORS } from '../constants/colors';

// Constants
const RAJESH_ID = '8'; // ID for Rajesh member

type GuestMatchDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'GuestMatchDetails'>;

// Extended Assignment type to include the fields we need
interface ExtendedAssignment {
    id: string;
    matchId: string;
    memberId: string;
    teamAChit: number;
    teamBChit: number;
    score?: number;
    bothFromSameTeam?: boolean;
    teamPositionsFrom?: string;
}

// Interface for member with score for sorting
interface MemberWithScore {
    assignment: ExtendedAssignment;
    totalScore: number;
    player1Score: number | undefined;
    player2Score: number | undefined;
}

const GuestMatchDetailsScreen = ({ route, navigation }: GuestMatchDetailsScreenProps) => {
    const { matchId } = route.params;
    const match = useAppSelector(state => selectMatchById(state, matchId),
        (prev, next) => prev?.id === next?.id);
    const dispatch = useAppDispatch();
    const assignments = useAppSelector(state => selectAssignmentsByMatch(state, matchId),
        (prev, next) =>
            prev.length === next.length &&
            prev.every((a, i) => a.id === next[i].id)) as ExtendedAssignment[];
    const members = useAppSelector(state => state.members.members,
        (prev, next) =>
            prev.length === next.length &&
            prev.every((m, i) => m.id === next[i].id));
    const googleSheetsData = useAppSelector(state => state.googleSheets,
        (prev, next) => prev.loading === next.loading && prev.error === next.error) as { loading: boolean; error: string | null };
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [dataFetched, setDataFetched] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const FETCH_THROTTLE_MS = 5000; // 5 seconds minimum between fetches

    // Add assignment loading state from Redux
    const { loading: assignmentLoading, error: assignmentError } = useAppSelector(state => state.assignments);

    // Get player scores for this match
    const playerScores = useAppSelector(
        state => {
            // Filter for this match and sort by playerId for consistent ordering
            const matchScores = state.playerScores.scores
                .filter(score => score.matchId === matchId)
                .sort((a, b) => a.playerId.localeCompare(b.playerId));
            return matchScores;
        },
        (prev, next) =>
            prev.length === next.length &&
            prev.every((score, i) =>
                score.id === next[i].id &&
                score.runs === next[i].runs &&
                score.playerId === next[i].playerId
            )
    );

    // Define handleFetchFromGoogleSheets using useCallback
    const handleFetchFromGoogleSheets = useCallback(async (forceRefresh = false) => {
        // Ensure match exists before proceeding
        if (!match) {
            setSnackbarMessage('Match data not available');
            setSnackbarVisible(true);
            return;
        }

        // Throttle fetches unless forceRefresh is true
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime;
        if (!forceRefresh && timeSinceLastFetch < FETCH_THROTTLE_MS) {
            console.log(`[Guest] Throttling fetch request (last fetch was ${timeSinceLastFetch}ms ago)`);
            return;
        }

        try {
            setLastFetchTime(now);
            const resultAction = await dispatch(fetchMatchData(matchId));

            if (fetchMatchData.fulfilled.match(resultAction)) {
                const matchData = resultAction.payload;

                // Create map of members by name to find IDs
                const memberNameToId = new Map(members.map(m => [m.name.toLowerCase(), m.id]));
                let assignmentsAdded = 0;
                let assignmentsDeleted = 0;
                let scoreUpdates = [];
                let scoreDeletions: string[] = [];

                // Create sets to track what exists in the spreadsheet
                const spreadsheetAssignments = new Set();
                const spreadsheetScores = new Set();

                // Get current player scores for comparison
                const currentPlayerScores = playerScores;

                console.log("[Guest] Match Teams:", match.teamA, match.teamB);
                console.log("[Guest] Received player assignments:", matchData.playerAssignments);

                // Process each assignment from Google Sheets
                for (const player of matchData.playerAssignments) {
                    const memberName = player.member.toLowerCase();
                    const memberId = memberNameToId.get(memberName);

                    if (!memberId) {
                        console.log(`[Guest] Member ${player.member} not found in app`);
                        continue;
                    }

                    // Skip if no positions defined
                    if (!player.p1 && !player.p2) {
                        console.log(`[Guest] No positions for ${player.member} - skipping`);
                        continue;
                    }

                    console.log(`[Guest] Processing assignment for ${player.member}:`, {
                        p1: player.p1,
                        p1Score: player.p1Score,
                        p2: player.p2,
                        p2Score: player.p2Score,
                        total: player.total
                    });

                    // Extract positions from format like "KKR1", "RCB3"
                    let position1 = { team: '', position: 0 };
                    let position2 = { team: '', position: 0 };

                    // Process first position
                    if (player.p1) {
                        const team = player.p1.match(/[A-Z]+/)?.[0] || '';
                        const positionStr = player.p1.replace(team, '');
                        const positionNum = parseInt(positionStr, 10) || 0;

                        if (!team || !positionNum || positionNum <= 0) {
                            console.log(`[Guest] Invalid position format for p1: ${player.p1}`);
                        } else if (team !== match.teamA && team !== match.teamB) {
                            console.log(`[Guest] Team code ${team} doesn't match either team - skipping`);
                            continue;
                        } else {
                            position1 = { team, position: positionNum };

                            // Add score update for this player only if score value exists in the spreadsheet
                            const hasValidScore = player.p1Score !== undefined &&
                                player.p1Score !== null &&
                                !(isNaN(Number(player.p1Score)) || String(player.p1Score).trim() === '');

                            if (hasValidScore) {
                                const numericScore = Number(player.p1Score);
                                const scoreId = `${matchId}-${team}-${positionNum}`;
                                scoreUpdates.push({
                                    id: scoreId,
                                    matchId,
                                    playerId: `${team}${positionNum}`,
                                    runs: numericScore
                                });
                                spreadsheetScores.add(scoreId);
                            }
                        }
                    }

                    // Process second position
                    if (player.p2) {
                        const team = player.p2.match(/[A-Z]+/)?.[0] || '';
                        const positionStr = player.p2.replace(team, '');
                        const positionNum = parseInt(positionStr, 10) || 0;

                        if (!team || !positionNum || positionNum <= 0) {
                            console.log(`[Guest] Invalid position format for p2: ${player.p2}`);
                        } else if (team !== match.teamA && team !== match.teamB) {
                            console.log(`[Guest] Team code ${team} doesn't match either team - skipping`);
                            continue;
                        } else {
                            position2 = { team, position: positionNum };

                            // Add score update for this player only if score value exists in the spreadsheet
                            const hasValidScore = player.p2Score !== undefined &&
                                player.p2Score !== null &&
                                !(isNaN(Number(player.p2Score)) || String(player.p2Score).trim() === '');

                            if (hasValidScore) {
                                const numericScore = Number(player.p2Score);
                                const scoreId = `${matchId}-${team}-${positionNum}`;
                                scoreUpdates.push({
                                    id: scoreId,
                                    matchId,
                                    playerId: `${team}${positionNum}`,
                                    runs: numericScore
                                });
                                spreadsheetScores.add(scoreId);
                            }
                        }
                    }

                    // Skip if both positions are invalid
                    if (position1.position === 0 && position2.position === 0) {
                        console.log(`[Guest] No valid positions found - skipping`);
                        continue;
                    }

                    // Check if this member already has an assignment
                    const existingAssignment = assignments.find(a => a.memberId === memberId);

                    // If no existing assignment, create a temporary one for display
                    if (!existingAssignment) {
                        // Determine if both positions are from the same team
                        const bothFromSameTeam =
                            position1.position > 0 &&
                            position2.position > 0 &&
                            position1.team === position2.team;

                        const teamPositionsFrom = bothFromSameTeam ? position1.team : undefined;

                        // Set up the assignment
                        let teamAPosition = 0;
                        let teamBPosition = 0;

                        if (bothFromSameTeam) {
                            // For same team assignments, sort positions to keep lower number in teamAChit
                            const sortedPositions = [position1.position, position2.position].sort((a, b) => a - b);
                            teamAPosition = sortedPositions[0];
                            teamBPosition = sortedPositions[1];

                            console.log(`[Guest] Both positions from same team ${teamPositionsFrom}: ${teamAPosition}, ${teamBPosition}`);
                        } else {
                            // For different teams, assign to the appropriate team
                            if (position1.team === match.teamA) {
                                teamAPosition = position1.position;
                            } else if (position1.team === match.teamB) {
                                teamBPosition = position1.position;
                            }

                            if (position2.team === match.teamA) {
                                teamAPosition = position2.position;
                            } else if (position2.team === match.teamB) {
                                teamBPosition = position2.position;
                            }

                            console.log(`[Guest] Positions from different teams: ${match.teamA}:${teamAPosition}, ${match.teamB}:${teamBPosition}`);
                        }

                        const generateId = () => {
                            const timestamp = Date.now().toString(36);
                            const randomStr = Math.random().toString(36).substring(2, 8);
                            return `${timestamp}-${randomStr}`;
                        };

                        // Create new assignment for display purposes only
                        const newAssignment = {
                            id: generateId(),
                            matchId,
                            memberId,
                            teamAChit: teamAPosition,
                            teamBChit: teamBPosition,
                            score: 0,
                            bothFromSameTeam,
                            teamPositionsFrom
                        };

                        dispatch(addAssignment(newAssignment));
                        assignmentsAdded++;
                        console.log(`[Guest] Added assignment for ${player.member}:`, newAssignment);
                    }

                    // Track this assignment in the spreadsheet set
                    spreadsheetAssignments.add(memberId);
                }

                // Find and remove assignments that exist in the app but not in the spreadsheet
                assignments.forEach(assignment => {
                    if (!spreadsheetAssignments.has(assignment.memberId)) {
                        dispatch(deleteAssignment({
                            matchId,
                            memberId: assignment.memberId
                        }));
                        assignmentsDeleted++;
                    }
                });

                // Find and remove scores that exist in the app but not in the spreadsheet
                currentPlayerScores.forEach(score => {
                    if (!spreadsheetScores.has(score.id)) {
                        scoreDeletions.push(score.id);
                    }
                });

                // Update player scores if we have any
                if (scoreUpdates.length > 0) {
                    dispatch(updatePlayerScores(scoreUpdates));
                    console.log(`[Guest] Updated ${scoreUpdates.length} player scores in Redux store`);
                }

                // Remove deleted scores
                if (scoreDeletions.length > 0) {
                    dispatch(updatePlayerScores(scoreDeletions.map(id => ({
                        id,
                        matchId,
                        playerId: id.split('-')[2], // Extract playerId from the score id
                        runs: undefined // Setting to undefined will trigger deletion
                    }))));
                    console.log(`[Guest] Removed ${scoreDeletions.length} deleted player scores`);
                }

                // Show success message
                if (assignmentsAdded > 0 || assignmentsDeleted > 0 || scoreUpdates.length > 0 || scoreDeletions.length > 0) {
                    setSnackbarMessage('Data fetched successfully');
                } else {
                    setSnackbarMessage('Data is up to date');
                }
                setSnackbarVisible(true);
            } else {
                setSnackbarMessage('Failed to load match data');
                setSnackbarVisible(true);
            }
        } catch (error) {
            console.error('[Guest] Error syncing with Google Sheets:', error);
            setSnackbarMessage('Error syncing with Google Sheets');
            setSnackbarVisible(true);
        }
    }, [matchId, dispatch, match, members, assignments, lastFetchTime, playerScores]);

    // Auto-fetch data from Google Sheets when screen loads
    useEffect(() => {
        if (match && !dataFetched && !googleSheetsData.loading) {
            console.log("[Guest] Initial data fetch, assignments:", assignments.length);
            handleFetchFromGoogleSheets(true); // Force refresh on initial load
            setDataFetched(true);
        }
    }, [match, dataFetched, googleSheetsData.loading, handleFetchFromGoogleSheets, assignments]);

    // Auto-assign Rajesh when screen loads
    useEffect(() => {
        if (match && members) {
            // Check if Rajesh exists as a member
            const rajeshMember = members.find(m => m.id === RAJESH_ID);
            if (!rajeshMember) return;

            // Find all existing Rajesh assignments for this match
            const rajeshAssignments = assignments.filter(a => a.memberId === RAJESH_ID);

            // If Rajesh has multiple assignments, keep only one
            if (rajeshAssignments.length > 1) {
                console.log(`[Guest] Found ${rajeshAssignments.length} duplicate Rajesh assignments, cleaning up...`);

                // Keep the first assignment and dispatch removal actions for the others
                for (let i = 1; i < rajeshAssignments.length; i++) {
                    dispatch(deleteAssignment({
                        matchId,
                        memberId: RAJESH_ID
                    }));
                    console.log(`[Guest] Removed duplicate Rajesh assignment: ${rajeshAssignments[i].id}`);
                }
            }
            // If no Rajesh assignment exists, create one
            else if (rajeshAssignments.length === 0) {
                const generateId = () => {
                    const timestamp = Date.now().toString(36);
                    const randomStr = Math.random().toString(36).substring(2, 8);
                    return `${timestamp}-${randomStr}`;
                };

                const assignment = {
                    id: generateId(),
                    matchId,
                    memberId: RAJESH_ID,
                    teamAChit: 8,
                    teamBChit: 8,
                    score: 0,
                    bothFromSameTeam: false, // Not from same team since it's both teamA and teamB
                };

                dispatch(addAssignment(assignment));

                // Log message for debugging but don't show to user
                console.log('[Guest] Rajesh automatically assigned to position 8 for both teams');
            }
        }
    }, [match, members, assignments, matchId, dispatch]);

    // Handle assignment errors
    useEffect(() => {
        if (assignmentError) {
            setSnackbarMessage(`Error: ${assignmentError}`);
            setSnackbarVisible(true);
            dispatch(clearAssignmentError());
        }
    }, [assignmentError, dispatch]);

    if (!match) {
        return (
            <View style={styles.container}>
                <Text variant="headlineMedium">Match not found</Text>
            </View>
        );
    }

    const teamA = useAppSelector(state => selectTeamByShortName(state, match.teamA),
        (prev, next) => prev?.id === next?.id);
    const teamB = useAppSelector(state => selectTeamByShortName(state, match.teamB),
        (prev, next) => prev?.id === next?.id);
    const matchDate = new Date(match.date);
    const formattedDate = format(matchDate, 'MMMM dd, yyyy');

    // Debug effect to log assignments whenever they change
    useEffect(() => {
        console.log("[Guest] Assignments changed, current count:", assignments.length);
        if (assignments.length > 0) {
            console.log("[Guest] First assignment:", {
                memberId: assignments[0].memberId,
                member: members.find(m => m.id === assignments[0].memberId)?.name,
                teamA: match?.teamA,
                teamB: match?.teamB,
                teamAChit: assignments[0].teamAChit,
                teamBChit: assignments[0].teamBChit
            });
        }
    }, [assignments, members, match]);

    // Debug effect to log playerScores whenever they change
    useEffect(() => {
        console.log("[Guest] Player scores count:", playerScores?.length || 0);
    }, [playerScores]);

    const getMemberScore = useMemo(() => {
        return (assignment: ExtendedAssignment) => {
            // Determine player IDs based on whether both are from the same team
            const player1Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamAChit}`
                : `${match.teamA}${assignment.teamAChit}`;

            const player2Id = assignment.bothFromSameTeam && assignment.teamPositionsFrom
                ? `${assignment.teamPositionsFrom}${assignment.teamBChit}`
                : `${match.teamB}${assignment.teamBChit}`;

            // Find the scores in the playerScores array
            const player1ScoreObj = playerScores.find(
                score => score.playerId === player1Id
            );

            const player2ScoreObj = playerScores.find(
                score => score.playerId === player2Id
            );

            // Get the runs values or undefined if no score found
            const player1Score = player1ScoreObj?.runs;
            const player2Score = player2ScoreObj?.runs;

            // Calculate total including zeros
            const totalScore =
                (player1Score !== undefined && player1Score !== null ? Number(player1Score) : 0) +
                (player2Score !== undefined && player2Score !== null ? Number(player2Score) : 0);

            return {
                player1Score,
                player2Score,
                totalScore
            };
        };
    }, [playerScores, match.teamA, match.teamB]);

    // Sort assignments by score (highest first)
    const sortedAssignments = useMemo(() => {
        // First, filter out duplicates by memberId (to prevent duplicate Rajesh entries)
        const uniqueMemberIds = new Set();
        const uniqueAssignments = assignments.filter(assignment => {
            if (uniqueMemberIds.has(assignment.memberId)) {
                return false;
            }
            uniqueMemberIds.add(assignment.memberId);
            return true;
        });

        const assignmentsWithScores: MemberWithScore[] = uniqueAssignments.map(assignment => {
            const scores = getMemberScore(assignment);
            return {
                assignment,
                ...scores
            };
        });

        return assignmentsWithScores.sort((a, b) => b.totalScore - a.totalScore);
    }, [assignments, playerScores, getMemberScore]);

    const renderMemberScores = useCallback(() => {
        console.log("[Guest] Rendering member scores, assignments count:", assignments.length);

        if (assignments.length === 0) {
            console.log("[Guest] No assignments available to render scores");
            return (
                <Text style={styles.noData}>No assignments yet</Text>
            );
        }

        console.log("[Guest] Rendering scores with sortedAssignments count:", sortedAssignments.length);
        if (sortedAssignments.length > 0) {
            console.log("[Guest] First sorted assignment:", {
                memberId: sortedAssignments[0].assignment.memberId,
                member: members.find(m => m.id === sortedAssignments[0].assignment.memberId)?.name,
                player1Score: sortedAssignments[0].player1Score,
                player2Score: sortedAssignments[0].player2Score,
                totalScore: sortedAssignments[0].totalScore
            });
        }

        return (
            <DataTable>
                <DataTable.Header>
                    <DataTable.Title>Member</DataTable.Title>
                    <DataTable.Title numeric>P1</DataTable.Title>
                    <DataTable.Title numeric>P2</DataTable.Title>
                    <DataTable.Title numeric>Total</DataTable.Title>
                </DataTable.Header>

                {sortedAssignments.map(({ assignment, player1Score, player2Score, totalScore }) => {
                    const member = members.find(m => m.id === assignment.memberId);

                    // Calculate total score correctly, including actual zeros
                    let totalScoreToShow = 0;
                    if (player1Score !== undefined && player1Score !== null) {
                        totalScoreToShow += Number(player1Score);
                    }
                    if (player2Score !== undefined && player2Score !== null) {
                        totalScoreToShow += Number(player2Score);
                    }

                    // Show "-" only if both scores are undefined/null
                    const showDash = player1Score === undefined && player2Score === undefined ||
                        player1Score === null && player2Score === null;

                    return (
                        <DataTable.Row key={assignment.memberId}>
                            <DataTable.Cell>{member?.name}</DataTable.Cell>
                            <DataTable.Cell numeric>
                                <Text>
                                    {player1Score !== undefined && player1Score !== null ?
                                        player1Score.toString() : "-"}
                                    <Text style={styles.position}>
                                        {assignment.bothFromSameTeam && assignment.teamPositionsFrom
                                            ? ` ${assignment.teamPositionsFrom}(#${assignment.teamAChit})`
                                            : ` ${match.teamA}(#${assignment.teamAChit})`}
                                    </Text>
                                </Text>
                            </DataTable.Cell>
                            <DataTable.Cell numeric>
                                <Text>
                                    {player2Score !== undefined && player2Score !== null ?
                                        player2Score.toString() : "-"}
                                    <Text style={styles.position}>
                                        {assignment.bothFromSameTeam && assignment.teamPositionsFrom
                                            ? ` ${assignment.teamPositionsFrom}(#${assignment.teamBChit})`
                                            : ` ${match.teamB}(#${assignment.teamBChit})`}
                                    </Text>
                                </Text>
                            </DataTable.Cell>
                            <DataTable.Cell numeric>
                                <Text style={styles.total}>
                                    {showDash ? "-" : totalScoreToShow}
                                </Text>
                            </DataTable.Cell>
                        </DataTable.Row>
                    );
                })}
            </DataTable>
        );
    }, [match, sortedAssignments, members, playerScores]);

    const renderMemberAssignment = useCallback((assignment: ExtendedAssignment) => {
        const member = members.find(m => m.id === assignment.memberId);

        // Format the positions text more compactly
        let positionsText = '';
        if (assignment.bothFromSameTeam && assignment.teamPositionsFrom) {
            positionsText = `${assignment.teamPositionsFrom}: ${assignment.teamAChit},${assignment.teamBChit}`;
        } else {
            positionsText = `${match.teamA}:${assignment.teamAChit}, ${match.teamB}:${assignment.teamBChit}`;
        }

        return (
            <Card style={styles.assignmentCard} key={assignment.memberId}>
                <Card.Content style={styles.cardContent}>
                    <View style={styles.assignmentHeader}>
                        <View style={styles.memberInfo}>
                            <List.Icon icon="account" style={styles.memberIcon} />
                            <Text style={styles.memberName}>{member?.name}</Text>
                            <Text style={styles.memberPositions}>{positionsText}</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    }, [match, members]);

    // Sort member assignments the same way for consistency
    const renderAssignments = useCallback(() => {
        console.log("[Guest] Rendering assignments, count:", sortedAssignments.length);

        if (sortedAssignments.length === 0) {
            console.log("[Guest] No sorted assignments to render");
            return (
                <Text style={styles.noData}>No assignments yet</Text>
            );
        }

        console.log("[Guest] Will render assignment cards");
        return sortedAssignments.map(({ assignment }) => renderMemberAssignment(assignment));
    }, [sortedAssignments, renderMemberAssignment]);

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

        // Check if all players have scores (and the scores are not undefined/null)
        const allPlayersHaveScores = playerIds.every(playerId => {
            const score = playerScores.find(score => score.playerId === playerId);
            return score !== undefined && score.runs !== undefined && score.runs !== null;
        });

        return allPlayersHaveScores;
    }, [assignments, playerScores, match.teamA, match.teamB]);

    const getWinners = useMemo(() => {
        if (sortedAssignments.length === 0) return [];

        const winners: { id: string; name: string; score: number }[] = [];
        let maxScore = -Infinity;

        sortedAssignments.forEach(member => {
            if (member.totalScore > maxScore) {
                maxScore = member.totalScore;
                winners.length = 0;
                winners.push({
                    id: member.assignment.memberId,
                    name: members.find(m => m.id === member.assignment.memberId)?.name || '',
                    score: member.totalScore
                });
            } else if (member.totalScore === maxScore) {
                winners.push({
                    id: member.assignment.memberId,
                    name: members.find(m => m.id === member.assignment.memberId)?.name || '',
                    score: member.totalScore
                });
            }
        });

        return winners;
    }, [sortedAssignments, members]);

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <Card style={[styles.card, { marginTop: 16 }]}>
                    <Card.Title title={`${teamA?.name} vs ${teamB?.name}`} subtitle={formattedDate} />
                    <Divider />
                    <Card.Content>
                        <Button
                            mode="outlined"
                            icon="cloud-download"
                            onPress={() => handleFetchFromGoogleSheets(true)} // Force refresh when button is pressed
                            style={styles.syncButton}
                            loading={googleSheetsData.loading}
                            disabled={googleSheetsData.loading}
                        >
                            Refresh Data
                        </Button>
                    </Card.Content>
                </Card>

                {/* Current Assignments */}
                <Card style={[styles.card, styles.lastCard]}>
                    <Card.Title title="Current Assignments" />
                    <Divider />
                    <Card.Content style={styles.assignmentsContainer}>
                        {assignments.length === 0 ? (
                            <Text style={styles.noData}>No assignments yet</Text>
                        ) : (
                            renderAssignments()
                        )}
                    </Card.Content>
                </Card>

                {/* Member Scores */}
                <Card style={styles.card}>
                    <Card.Title
                        title="Member Scores"
                        subtitle="Current match scores"
                    />
                    <Divider />
                    <Card.Content>
                        {renderMemberScores()}
                    </Card.Content>
                    <Card.Actions style={styles.cardActions}>
                        <Button
                            mode="outlined"
                            onPress={() => handleFetchFromGoogleSheets(true)}
                            icon="refresh"
                        >
                            Refresh Scores
                        </Button>
                    </Card.Actions>
                </Card>

                {/* Winner Badge */}
                {sortedAssignments.length > 0 && isMatchComplete && (
                    <Card style={styles.card}>
                        <Card.Title title="Match Winners" />
                        <Card.Content>
                            {getWinners.map((winner, index) => (
                                <View key={winner.id} style={styles.winnerContainer}>
                                    <Badge style={styles.winnerBadge}>{getWinners.length > 1 ? 'TIE' : 'WINNER'}</Badge>
                                    <Text style={styles.winnerName}>
                                        {winner.name} ({winner.score} points)
                                    </Text>
                                </View>
                            ))}
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                wrapperStyle={{ position: 'absolute', top: 20, width: '100%', zIndex: 1000 }}
                style={{ marginBottom: 0 }}
                duration={2000}
            >
                {snackbarMessage}
            </Snackbar>

            {/* Loading overlay for assignments being updated */}
            {assignmentLoading && (
                <Portal>
                    <Modal
                        visible={true}
                        dismissable={false}
                        contentContainerStyle={styles.loadingModal}
                    >
                        <ActivityIndicator size="large" color="#006064" />
                        <Text style={styles.loadingText}>
                            Updating spreadsheet...
                        </Text>
                    </Modal>
                </Portal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
    },
    contentContainer: {
        paddingBottom: 140,
    },
    card: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: COLORS.LIME,
        borderRadius: 0,
    },
    matchTitle: {
        textAlign: 'center',
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    date: {
        textAlign: 'center',
        marginTop: 8,
        color: COLORS.DARK,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    actionDescription: {
        textAlign: 'center',
        marginVertical: 8,
        color: COLORS.DARK,
    },
    cardActions: {
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.DARK,
        marginTop: 8,
    },
    noData: {
        textAlign: 'center',
        fontStyle: 'italic',
        marginVertical: 16,
        color: COLORS.DARK,
    },
    lastCard: {
        marginBottom: 16,
    },
    assignmentCard: {
        marginVertical: 6,
        marginHorizontal: 16,
        backgroundColor: COLORS.WHITE,
        borderRadius: 0,
        elevation: 2,
    },
    cardContent: {
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    assignmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberIcon: {
        margin: 0,
        marginLeft: -4,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '500',
        marginRight: 8,
        color: COLORS.DARK,
    },
    positionsContainer: {
        marginLeft: 40,
    },
    positionText: {
        color: COLORS.DARK,
        fontSize: 14,
        marginBottom: 4,
    },
    assignmentsContainer: {
        paddingHorizontal: 0,
    },
    position: {
        fontSize: 12,
        color: COLORS.DARK,
        marginLeft: 4,
    },
    headerButton: {
        marginRight: 16,
        borderRadius: 0,
    },
    memberPositions: {
        fontSize: 12,
        color: COLORS.DARK,
    },
    winnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    winnerBadge: {
        backgroundColor: COLORS.DARK,
        color: COLORS.WHITE,
        marginRight: 8,
        borderRadius: 0,
    },
    winnerName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: COLORS.DARK,
    },
    header: {
        marginBottom: 16,
        backgroundColor: COLORS.LIME,
    },
    matchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerCol: {
        flexDirection: 'column',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    headerDetail: {
        fontSize: 14,
        color: COLORS.DARK,
    },
    syncButton: {
        marginTop: 8,
        borderRadius: 0,
        borderColor: COLORS.DARK,
    },
    total: {
        fontSize: 12,
        color: COLORS.DARK,
    },
    loadingModal: {
        backgroundColor: COLORS.WHITE,
        padding: 20,
        margin: 20,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
        color: COLORS.DARK,
    },
});

export default GuestMatchDetailsScreen; 