import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Button, RadioButton, IconButton, useTheme, Snackbar, Portal, Modal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { RootStackParamList } from '../navigation';
import { addAssignment, updateAssignment, deleteAssignment, createAssignmentAsync, updateAssignmentAsync, deleteAssignmentAsync, clearAssignmentError } from '../store/slices/assignmentsSlice';
import { fetchMatchData } from '../store/slices/googleSheetsSlice';
import { PlayerPosition as GoogleSheetsPlayerPosition } from '../services/GoogleSheetsService';
import { COLORS } from '../constants/colors';

type AssignPlayersScreenProps = NativeStackScreenProps<RootStackParamList, 'AssignPlayers'>;

const RAJESH_ID = '8'; // ID for Rajesh
const RAJESH_POSITION = '8'; // Fixed position for Rajesh
const MAX_PLAYERS = 8;

// Interface matching Redux store expectations
interface Assignment {
    id: string;
    matchId: string;
    memberId: string;
    teamAChit: number;
    teamBChit: number;
    score: number;
}

// Extended Assignment interface with our additional fields
interface ExtendedAssignment extends Assignment {
    bothFromSameTeam?: boolean;
    teamPositionsFrom?: string;
}

// Simple ID generator
const generateId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
};

type PlayerPosition = {
    teamName: string;
    position: number;
};

const AssignPlayersScreen = ({ route, navigation }: AssignPlayersScreenProps) => {
    const { matchId, editAssignment } = route.params;
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const scrollViewRef = useRef<ScrollView>(null);

    const match = useAppSelector(state =>
        state.matches.matches.find(m => m.id === matchId)
    );
    const members = useAppSelector(state => state.members.members);
    const teams = useAppSelector(state => state.teams.teams);

    // Memoize selectors to prevent unnecessary rerenders
    const existingAssignments = useAppSelector(
        state => state.assignments.assignments.filter(a => a.matchId === matchId),
        // Use a custom equality function to prevent reference changes causing rerenders
        (prev, next) => {
            if (prev.length !== next.length) return false;
            return prev.every((item, index) => item.id === next[index].id);
        }
    ) as ExtendedAssignment[];

    const googleSheetsData = useAppSelector(state => state.googleSheets) as { loading: boolean; error: string | null };

    // Add assignment loading state from Redux
    const { loading: assignmentLoading, error: assignmentError } = useAppSelector(state => state.assignments);

    const [selectedMember, setSelectedMember] = useState('');
    const [selectedPositions, setSelectedPositions] = useState<PlayerPosition[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // Initialize form if editing
    useEffect(() => {
        if (editAssignment) {
            const assignment = existingAssignments.find(a => a.id === editAssignment.id);
            if (assignment) {
                setSelectedMember(assignment.memberId);

                if (assignment.bothFromSameTeam && assignment.teamPositionsFrom) {
                    setSelectedPositions([
                        { teamName: assignment.teamPositionsFrom, position: assignment.teamAChit },
                        { teamName: assignment.teamPositionsFrom, position: assignment.teamBChit }
                    ]);
                } else {
                    setSelectedPositions([
                        { teamName: match?.teamA || '', position: assignment.teamAChit },
                        { teamName: match?.teamB || '', position: assignment.teamBChit }
                    ]);
                }

                setIsEditing(true);
                setEditingAssignmentId(assignment.id);
            }
        }
    }, [editAssignment, match]);

    // Auto-assign Rajesh when screen loads
    useEffect(() => {
        if (match && members) {
            // Check if Rajesh exists as a member
            const rajeshMember = members.find(m => m.id === RAJESH_ID);
            if (!rajeshMember) return;

            // Check if Rajesh already has an assignment for this match
            const rajeshAssignment = existingAssignments.find(a => a.memberId === RAJESH_ID);

            // If no existing assignment, create one
            if (!rajeshAssignment && !isEditing) {
                const assignment: ExtendedAssignment = {
                    id: generateId(),
                    matchId,
                    memberId: RAJESH_ID,
                    teamAChit: 8,
                    teamBChit: 8,
                    score: 0,
                    bothFromSameTeam: false, // Not from same team since it's both teamA and teamB
                };

                dispatch(addAssignment(assignment as any));

                // Show success message
                setSnackbarMessage('Rajesh automatically assigned to position 8 for both teams');
                setSnackbarVisible(true);
            }
        }
    }, [match, members, existingAssignments, isEditing, matchId]);

    // Handle position selection for members (not for Rajesh)
    useEffect(() => {
        if (selectedMember === RAJESH_ID) {
            setSelectedPositions([
                { teamName: match?.teamA || '', position: 8 },
                { teamName: match?.teamB || '', position: 8 }
            ]);
        } else {
            // Only clear if we're switching away from Rajesh or initial selection
            if (selectedPositions.some(p => p.position === 8)) {
                setSelectedPositions([]);
            }
        }
    }, [selectedMember, match?.teamA, match?.teamB]);

    useEffect(() => {
        // Show error message if there was an error updating assignment
        if (assignmentError) {
            setSnackbarMessage(`Error: ${assignmentError}`);
            setSnackbarVisible(true);
            dispatch(clearAssignmentError());
        }
    }, [assignmentError, dispatch]);

    if (!match) {
        return (
            <View style={styles.container}>
                <Text>Match not found</Text>
            </View>
        );
    }

    const teamA = useMemo(() => {
        return teams.find(team => team.shortName === match.teamA);
    }, [teams, match.teamA]);

    const teamB = useMemo(() => {
        return teams.find(team => team.shortName === match.teamB);
    }, [teams, match.teamB]);

    // Pre-compute assigned positions for both teams
    const teamAAssignedPositions = useMemo(() => {
        return existingAssignments
            .filter(a => a.id !== editingAssignmentId)
            .flatMap(a => {
                if (a.bothFromSameTeam && a.teamPositionsFrom === match.teamA) {
                    return [a.teamAChit, a.teamBChit];
                } else if (!a.bothFromSameTeam) {
                    return [a.teamAChit];
                }
                return [];
            });
    }, [existingAssignments, editingAssignmentId, match.teamA]);

    const teamBAssignedPositions = useMemo(() => {
        return existingAssignments
            .filter(a => a.id !== editingAssignmentId)
            .flatMap(a => {
                if (a.bothFromSameTeam && a.teamPositionsFrom === match.teamB) {
                    return [a.teamAChit, a.teamBChit];
                } else if (!a.bothFromSameTeam) {
                    return [a.teamBChit];
                }
                return [];
            });
    }, [existingAssignments, editingAssignmentId, match.teamB]);

    const handleEdit = useCallback((assignment: ExtendedAssignment) => {
        // Prevent editing of Rajesh's assignment
        if (assignment.memberId === RAJESH_ID) {
            Alert.alert(
                "Cannot Edit",
                "Rajesh's assignment cannot be edited as it's fixed to position 8 for both teams."
            );
            return;
        }

        setSelectedMember(assignment.memberId);

        if (assignment.bothFromSameTeam && assignment.teamPositionsFrom) {
            setSelectedPositions([
                { teamName: assignment.teamPositionsFrom, position: assignment.teamAChit },
                { teamName: assignment.teamPositionsFrom, position: assignment.teamBChit }
            ]);
        } else {
            setSelectedPositions([
                { teamName: match.teamA, position: assignment.teamAChit },
                { teamName: match.teamB, position: assignment.teamBChit }
            ]);
        }

        setIsEditing(true);
        setEditingAssignmentId(assignment.id);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, [match.teamA, match.teamB, scrollViewRef]);

    const handleDelete = useCallback((assignment: ExtendedAssignment) => {
        // Prevent deletion of Rajesh's assignment
        if (assignment.memberId === RAJESH_ID) {
            Alert.alert(
                "Cannot Delete",
                "Rajesh's assignment cannot be deleted as it's required for the game."
            );
            return;
        }

        Alert.alert(
            "Delete Assignment",
            "Are you sure you want to delete this assignment?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            // Set processing state
                            setSnackbarMessage('Deleting assignment...');
                            setSnackbarVisible(true);

                            // Use async action to delete assignment in both app and Google Sheets
                            await dispatch(deleteAssignmentAsync({
                                matchId: assignment.matchId,
                                memberId: assignment.memberId
                            })).unwrap();

                            // Show success message
                            setSnackbarMessage('Assignment deleted successfully');
                            setSnackbarVisible(true);
                        } catch (error) {
                            console.error('Error deleting assignment:', error);
                            setSnackbarMessage('Error deleting assignment');
                            setSnackbarVisible(true);
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    }, [dispatch, setSnackbarMessage, setSnackbarVisible]);

    const handlePositionSelect = useCallback((teamName: string, position: number) => {
        // Prevent selection of position 8 for non-Rajesh members
        if (position === 8 && selectedMember !== RAJESH_ID) return;

        if (selectedMember === RAJESH_ID) return;

        setSelectedPositions(prev => {
            // Check if this position is already selected
            const existingIndex = prev.findIndex(p =>
                p.teamName === teamName && p.position === position
            );

            // If position is already selected, remove it
            if (existingIndex !== -1) {
                return prev.filter((_, index) => index !== existingIndex);
            }

            // If we already have 2 positions selected, remove the oldest one
            if (prev.length >= 2) {
                return [prev[1], { teamName, position }];
            }

            // Add new position
            return [...prev, { teamName, position }];
        });
    }, [selectedMember]);

    const handleAssign = async () => {
        if (!selectedMember || selectedPositions.length !== 2) {
            Alert.alert('Error', 'Please select a member and two positions');
            return;
        }

        // Special handling for Rajesh
        const isRajesh = selectedMember === RAJESH_ID;
        if (isRajesh && (selectedPositions[0].position !== 8 || selectedPositions[1].position !== 8)) {
            Alert.alert('Error', 'Rajesh must be assigned position 8 for both teams');
            return;
        }

        // Check if any of the selected positions are already assigned to other members
        const isPositionTaken = selectedPositions.some(pos => {
            return existingAssignments
                .filter(a => a.id !== editingAssignmentId) // Exclude current editing assignment
                .some(a => {
                    // Check if position is already assigned
                    if (a.bothFromSameTeam && a.teamPositionsFrom) {
                        // For same team assignments
                        return a.teamPositionsFrom === pos.teamName &&
                            (a.teamAChit === pos.position || a.teamBChit === pos.position);
                    } else {
                        // For different team assignments
                        if (pos.teamName === match.teamA) {
                            return a.teamAChit === pos.position;
                        } else if (pos.teamName === match.teamB) {
                            return a.teamBChit === pos.position;
                        }
                    }
                    return false;
                });
        });

        if (isPositionTaken) {
            Alert.alert('Error', 'One or more selected positions are already assigned to other members');
            return;
        }

        try {
            // Set processing state
            setSnackbarMessage('Processing assignment...');
            setSnackbarVisible(true);

            // Create a new assignment
            const assignment: ExtendedAssignment = {
                id: isEditing ? editingAssignmentId! : generateId(),
                matchId,
                memberId: selectedMember,
                teamAChit: 0,
                teamBChit: 0,
                score: 0 // Add default score
            };

            // Check if both positions are from the same team
            const bothFromSameTeam = selectedPositions[0].teamName === selectedPositions[1].teamName;
            const teamPositionsFrom = bothFromSameTeam ? selectedPositions[0].teamName : undefined;

            if (bothFromSameTeam) {
                // Both positions are from the same team
                assignment.bothFromSameTeam = true;
                assignment.teamPositionsFrom = teamPositionsFrom;

                // Sort positions to ensure consistent assignment
                const sortedPositions = [...selectedPositions].sort((a, b) => a.position - b.position);
                assignment.teamAChit = sortedPositions[0].position;
                assignment.teamBChit = sortedPositions[1].position;
            } else {
                // Positions are from different teams, assign normally
                for (const pos of selectedPositions) {
                    if (pos.teamName === match.teamA) {
                        assignment.teamAChit = pos.position;
                    } else if (pos.teamName === match.teamB) {
                        assignment.teamBChit = pos.position;
                    }
                }
            }

            if (isEditing) {
                // Use async action to update both Redux and Google Sheets
                await dispatch(updateAssignmentAsync(assignment)).unwrap();
                setSnackbarMessage('Assignment updated in app and Google Sheets');
            } else {
                // Use async action to create assignment in both Redux and Google Sheets
                const { id, ...assignmentWithoutId } = assignment;
                await dispatch(createAssignmentAsync(assignmentWithoutId)).unwrap();
                setSnackbarMessage('Positions assigned in app and Google Sheets');
            }

            // Reset form
            setSelectedMember('');
            setSelectedPositions([]);
            setIsEditing(false);
            setEditingAssignmentId(null);
            setSnackbarVisible(true);
        } catch (error) {
            console.error('Error saving assignment:', error);
            setSnackbarMessage('Error saving assignment');
            setSnackbarVisible(true);
        }
    };

    const handleImportFromGoogleSheets = async () => {
        console.log("Importing from Google Sheets");
        try {
            const resultAction = await dispatch(fetchMatchData(matchId));

            if (fetchMatchData.fulfilled.match(resultAction)) {
                const matchData = resultAction.payload;

                // Create map of members by name to find IDs
                const memberNameToId = new Map(members.map(m => [m.name.toLowerCase(), m.id]));
                let importCount = 0;

                console.log("Match Teams:", match.teamA, match.teamB);

                // Process each assignment from Google Sheets
                for (const player of matchData.playerAssignments) {
                    const memberName = player.member.toLowerCase();
                    const memberId = memberNameToId.get(memberName);

                    console.log(`Processing assignment for ${player.member}:`, {
                        p1: player.p1,
                        p1Score: player.p1Score,
                        p2: player.p2,
                        p2Score: player.p2Score,
                        total: player.total
                    });

                    if (!memberId) {
                        console.log(`Member ${player.member} not found in app`);
                        continue;
                    }

                    // Skip Rajesh if already assigned
                    if (memberId === RAJESH_ID &&
                        existingAssignments.some(a => a.memberId === RAJESH_ID)) {
                        console.log(`Skipping Rajesh - already assigned`);
                        continue;
                    }

                    // Skip if this member already has an assignment
                    if (existingAssignments.some(a => a.memberId === memberId)) {
                        console.log(`Skipping ${player.member} - already has assignment`);
                        continue;
                    }

                    if (!player.p1 && !player.p2) {
                        console.log(`No positions for ${player.member} - skipping`);
                        continue;
                    }

                    // Extract positions from format like "KKR1", "RCB3"
                    let position1 = { team: '', position: 0 };
                    let position2 = { team: '', position: 0 };

                    // Process first position
                    if (player.p1) {
                        const team = player.p1.match(/[A-Z]+/)?.[0] || '';
                        const positionStr = player.p1.replace(team, '');
                        const positionNum = parseInt(positionStr, 10) || 0;

                        if (!team || !positionNum || positionNum <= 0 || positionNum > MAX_PLAYERS) {
                            console.log(`Invalid position format for p1: ${player.p1}`);
                        } else if (team !== match.teamA && team !== match.teamB) {
                            console.log(`Team code ${team} doesn't match either team - skipping`);
                            continue;
                        } else {
                            position1 = { team, position: positionNum };
                        }
                    }

                    // Process second position
                    if (player.p2) {
                        const team = player.p2.match(/[A-Z]+/)?.[0] || '';
                        const positionStr = player.p2.replace(team, '');
                        const positionNum = parseInt(positionStr, 10) || 0;

                        if (!team || !positionNum || positionNum <= 0 || positionNum > MAX_PLAYERS) {
                            console.log(`Invalid position format for p2: ${player.p2}`);
                        } else if (team !== match.teamA && team !== match.teamB) {
                            console.log(`Team code ${team} doesn't match either team - skipping`);
                            continue;
                        } else {
                            position2 = { team, position: positionNum };
                        }
                    }

                    // Skip if both positions are invalid
                    if (position1.position === 0 && position2.position === 0) {
                        console.log(`No valid positions found - skipping`);
                        continue;
                    }

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
                        // For same team assignments, use position1 and position2 directly
                        // Sort the positions to keep lower number in teamAChit
                        const sortedPositions = [position1.position, position2.position].sort((a, b) => a - b);
                        teamAPosition = sortedPositions[0];
                        teamBPosition = sortedPositions[1];

                        console.log(`Both positions from same team ${teamPositionsFrom}: ${teamAPosition}, ${teamBPosition}`);
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

                        console.log(`Positions from different teams: ${match.teamA}:${teamAPosition}, ${match.teamB}:${teamBPosition}`);
                    }

                    // Create assignment
                    const assignment: ExtendedAssignment = {
                        id: generateId(),
                        matchId,
                        memberId,
                        teamAChit: teamAPosition,
                        teamBChit: teamBPosition,
                        score: 0,
                        bothFromSameTeam,
                        teamPositionsFrom
                    };

                    console.log(`Creating assignment for ${player.member}:`, assignment);
                    dispatch(addAssignment(assignment as any));
                    importCount++;
                }

                setSnackbarMessage(`Imported ${importCount} assignments from Google Sheets`);
                setSnackbarVisible(true);
            } else {
                setSnackbarMessage('Failed to import assignments from Google Sheets');
                setSnackbarVisible(true);
            }
        } catch (error) {
            console.error('Error importing from Google Sheets:', error);
            setSnackbarMessage('Error importing from Google Sheets');
            setSnackbarVisible(true);
        }
    };

    // Filter out members who already have assignments (except the one being edited)
    const availableMembers = useMemo(() => {
        // Base filter - exclude members with assignments and Rajesh
        const filteredMembers = members.filter(
            member => !existingAssignments.some(assignment =>
                assignment.memberId === member.id &&
                (!isEditing || assignment.id !== editingAssignmentId)
            ) && member.id !== RAJESH_ID
        );

        // Add the editing member if needed
        if (isEditing && selectedMember) {
            const editingMember = members.find(m => m.id === selectedMember);
            if (editingMember &&
                !filteredMembers.includes(editingMember) &&
                editingMember.id !== RAJESH_ID) {
                return [...filteredMembers, editingMember];
            }
        }

        return filteredMembers;
    }, [members, existingAssignments, isEditing, editingAssignmentId, selectedMember]);

    // Get the editing member (if any)
    const editingMember = useMemo(() => {
        return members.find(m => m.id === selectedMember);
    }, [members, selectedMember]);

    // Memoize assignment list rendering
    const assignmentsList = useMemo(() => {
        if (existingAssignments.length === 0) return null;

        return existingAssignments.map(assignment => {
            const member = members.find(m => m.id === assignment.memberId);
            const isRajesh = assignment.memberId === RAJESH_ID;

            return (
                <View key={assignment.id} style={styles.assignment}>
                    <View style={styles.assignmentHeader}>
                        <Text style={styles.memberName}>{member?.name}</Text>
                        {!isRajesh && (
                            <View style={styles.actionButtons}>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    onPress={() => handleEdit(assignment)}
                                />
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    onPress={() => handleDelete(assignment)}
                                />
                            </View>
                        )}
                    </View>
                    <View style={styles.positionsContainer}>
                        {assignment.bothFromSameTeam && assignment.teamPositionsFrom ? (
                            <>
                                <Text style={styles.positions}>
                                    {assignment.teamPositionsFrom}: {assignment.teamAChit}, {assignment.teamBChit}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.positions}>
                                    {match.teamA}: {assignment.teamAChit}
                                </Text>
                                <Text style={styles.positions}>
                                    {match.teamB}: {assignment.teamBChit}
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            );
        });
    }, [existingAssignments, members, match.teamA, match.teamB, handleEdit, handleDelete]);

    const renderTeamPositions = (team: typeof teamA, shortName: string) => {
        // Get assigned positions for this team
        const assignedPositions = shortName === match.teamA ? teamAAssignedPositions : teamBAssignedPositions;
        const hasTwoPositionsSelected = selectedPositions.length === 2;

        return (
            <View style={styles.section}>
                <Text style={styles.label}>{team?.name} Positions:</Text>
                <View style={styles.chipsContainer}>
                    {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                        const position = i + 1;
                        const isSelected = selectedPositions.some(
                            p => p.teamName === shortName && p.position === position
                        );
                        const isAssigned = assignedPositions.includes(position);
                        const isDisabled = !selectedMember ||
                            (selectedMember === RAJESH_ID && position !== 8) ||
                            (position === 8 && selectedMember !== RAJESH_ID) ||
                            (isAssigned && !isSelected) ||
                            (hasTwoPositionsSelected && !isSelected); // Disable unselected positions when two are already selected

                        return (
                            <TouchableOpacity
                                key={`${shortName}-${position}`}
                                onPress={() => !isDisabled && handlePositionSelect(shortName, position)}
                                style={[
                                    styles.positionBox,
                                    isSelected && styles.selectedBox,
                                    isDisabled && styles.disabledBox
                                ]}
                                disabled={isDisabled}
                            >
                                <Text
                                    style={[
                                        styles.positionText,
                                        isSelected && styles.selectedText
                                    ]}
                                >
                                    {position}
                                    {(isAssigned || (position === 8 && selectedMember !== RAJESH_ID)) && !isSelected && (
                                        <Text style={[
                                            styles.assignedIndicator,
                                            isSelected && { color: COLORS.WHITE }
                                        ]}> •</Text>
                                    )}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {!selectedMember && (
                    <Text style={styles.warningText}>
                        Please select a member first
                    </Text>
                )}
                {selectedMember && selectedMember !== RAJESH_ID && (
                    <Text style={styles.warningText}>
                        Position 8 is reserved for Rajesh • Positions with • are already assigned
                        {hasTwoPositionsSelected && ' • Unselect a position to choose different one'}
                    </Text>
                )}
                {selectedMember && (
                    <Text style={styles.warningText}>
                        Selected positions: {selectedPositions.map(p =>
                            `${p.teamName}(${p.position})`).join(', ')}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <>
            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <Card style={styles.card}>
                    <Card.Title title={isEditing ? "Edit Assignment" : "Assign Batting Positions"} />
                    <Card.Content>
                        <Text style={styles.header}>
                            {teamA?.name} vs {teamB?.name}
                        </Text>

                        <Button
                            mode="outlined"
                            icon="cloud-download"
                            onPress={handleImportFromGoogleSheets}
                            style={styles.importButton}
                            loading={googleSheetsData.loading}
                            disabled={googleSheetsData.loading}
                            textColor={COLORS.DARK}
                            buttonColor={COLORS.WHITE}
                        >
                            Import from Google Sheets
                        </Button>

                        {/* Show automated Rajesh assignment notice */}
                        {existingAssignments.some(a => a.memberId === RAJESH_ID) ? (
                            <View style={styles.rajeshAutoAssignBanner}>
                                <Text style={styles.rajeshAutoAssignText}>
                                    Rajesh is automatically assigned to position 8 for both teams
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.section}>
                            <Text style={styles.label}>Select Member:</Text>
                            <RadioButton.Group
                                onValueChange={value => {
                                    setSelectedMember(value);
                                    setSelectedPositions([]); // Clear positions when member changes
                                }}
                                value={selectedMember}
                            >
                                {availableMembers.map(member => (
                                    <RadioButton.Item
                                        key={member.id}
                                        label={member.id === RAJESH_ID ? `${member.name} (Auto-assigned to position 8)` : member.name}
                                        value={member.id}
                                        disabled={member.id === RAJESH_ID && existingAssignments.some(a =>
                                            a.memberId === RAJESH_ID
                                        )}
                                    />
                                ))}
                            </RadioButton.Group>
                        </View>

                        <Text style={styles.instructionText}>
                            Select any two positions from either team (or one from each team)
                        </Text>

                        {renderTeamPositions(teamA, match.teamA)}
                        {renderTeamPositions(teamB, match.teamB)}

                        {selectedMember === RAJESH_ID && (
                            <Text style={styles.rajeshNote}>
                                Note: Rajesh is automatically assigned position 8 for both teams
                            </Text>
                        )}

                        {selectedMember !== RAJESH_ID && (
                            <Button
                                mode="contained"
                                onPress={handleAssign}
                                style={styles.button}
                                disabled={!selectedMember || selectedPositions.length !== 2}
                                buttonColor={COLORS.DARK}
                                textColor={COLORS.WHITE}
                            >
                                {isEditing ? 'Update Assignment' : 'Assign Positions'}
                            </Button>
                        )}

                        {isEditing && (
                            <Button
                                mode="outlined"
                                onPress={() => {
                                    setSelectedMember('');
                                    setSelectedPositions([]);
                                    setIsEditing(false);
                                    setEditingAssignmentId(null);
                                }}
                                style={[styles.button, styles.cancelButton]}
                                textColor={COLORS.DARK}
                                buttonColor={COLORS.WHITE}
                            >
                                Cancel Edit
                            </Button>
                        )}
                    </Card.Content>
                </Card>

                <Card style={[styles.card, styles.lastCard]}>
                    <Card.Title title="Current Assignments" />
                    <Card.Content>
                        {existingAssignments.length === 0 ? (
                            <Text style={styles.noData}>No assignments yet</Text>
                        ) : (
                            assignmentsList
                        )}
                    </Card.Content>
                </Card>
            </ScrollView>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                wrapperStyle={{ position: 'absolute', top: 20, width: '100%', zIndex: 1000 }}
                style={{ marginBottom: 0 }}
                duration={1000}
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
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    lastCard: {
        marginBottom: 16,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: COLORS.DARK,
    },
    section: {
        marginBottom: 16,
        backgroundColor: COLORS.WHITE,
        padding: 16,
        borderRadius: 0,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    label: {
        fontSize: 16,
        marginBottom: 12,
        color: COLORS.DARK,
        fontWeight: '600',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    positionBox: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.DARK,
        backgroundColor: COLORS.LIME,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    selectedBox: {
        backgroundColor: COLORS.DARK,
    },
    disabledBox: {
        opacity: 0.5,
        backgroundColor: '#f0f0f0',
        borderColor: '#ccc',
    },
    positionText: {
        fontSize: 16,
        color: COLORS.DARK,
        fontWeight: '600',
        textAlign: 'center',
    },
    selectedText: {
        color: COLORS.WHITE,
    },
    button: {
        marginTop: 16,
        borderRadius: 0,
        height: 48,
        justifyContent: 'center',
    },
    noData: {
        textAlign: 'center',
        fontStyle: 'italic',
        marginVertical: 16,
        color: COLORS.DARK,
    },
    assignment: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: COLORS.WHITE,
        borderRadius: 0,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.DARK,
    },
    memberName: {
        fontWeight: 'bold',
        marginBottom: 4,
        color: COLORS.DARK,
        fontSize: 16,
    },
    positions: {
        color: COLORS.DARK,
        fontSize: 14,
        marginBottom: 2,
    },
    positionsContainer: {
        marginTop: 8,
    },
    rajeshNote: {
        color: COLORS.DARK,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
        backgroundColor: COLORS.WHITE,
        padding: 12,
        borderRadius: 0,
    },
    instructionText: {
        color: COLORS.DARK,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        backgroundColor: COLORS.WHITE,
        padding: 12,
        borderRadius: 0,
        fontWeight: '500',
    },
    assignmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    cancelButton: {
        marginTop: 8,
        borderColor: COLORS.DARK,
        borderWidth: 1.5,
    },
    warningText: {
        color: COLORS.DARK,
        fontStyle: 'italic',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        backgroundColor: COLORS.WHITE,
        padding: 8,
        borderRadius: 0,
    },
    assignedIndicator: {
        color: COLORS.DARK,
        marginLeft: 2,
        fontWeight: 'bold',
    },
    importButton: {
        marginBottom: 16,
        borderRadius: 0,
        borderColor: COLORS.DARK,
        borderWidth: 1.5,
        height: 48,
        justifyContent: 'center',
    },
    rajeshAutoAssignBanner: {
        backgroundColor: COLORS.WHITE,
        padding: 12,
        borderRadius: 0,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.DARK,
    },
    rajeshAutoAssignText: {
        color: COLORS.DARK,
        fontStyle: 'italic',
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingModal: {
        backgroundColor: COLORS.WHITE,
        padding: 20,
        margin: 20,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
        color: COLORS.DARK,
        fontWeight: '500',
    },
});

export default AssignPlayersScreen; 