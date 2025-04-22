import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Text, Card, TextInput, Button, Divider, useTheme, Snackbar, Portal, Modal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { RootStackParamList } from '../navigation';
import { selectMatchById, selectTeamByShortName } from '../store/selectors';
import { updatePlayerScoresAsync, clearScoreError } from '../store/slices/playerScoresSlice';
import { fetchMatchData } from '../store/slices/googleSheetsSlice';
import { PlayerPosition } from '../services/GoogleSheetsService';
import { PlayerScore } from '../types';
import { COLORS } from '../constants/colors';

type PlayerScoresScreenProps = NativeStackScreenProps<RootStackParamList, 'PlayerScores'>;

const MAX_PLAYERS = 8;

const PlayerScoresScreen = ({ route, navigation }: PlayerScoresScreenProps) => {
    const { matchId } = route.params;
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const scrollViewRef = useRef<ScrollView>(null);

    const match = useAppSelector(
        state => selectMatchById(state, matchId),
        (prev, next) => prev?.id === next?.id
    );

    const teamA = useAppSelector(
        state => selectTeamByShortName(state, match?.teamA || ''),
        (prev, next) => prev?.id === next?.id
    );

    const teamB = useAppSelector(
        state => selectTeamByShortName(state, match?.teamB || ''),
        (prev, next) => prev?.id === next?.id
    );

    const playerScores = useAppSelector(
        state => state.playerScores.scores.filter(score => score.matchId === matchId),
        (prev, next) =>
            prev.length === next.length &&
            prev.every((score, i) =>
                score.id === next[i].id &&
                score.runs === next[i].runs
            )
    );

    // Get loading and error states from player scores slice
    const { loading: scoresLoading, error: scoresError } = useAppSelector(state => state.playerScores);

    const googleSheetsData = useAppSelector(
        state => state.googleSheets,
        (prev, next) =>
            prev.loading === next.loading &&
            prev.error === next.error
    ) as { loading: boolean; error: string | null };

    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Handle score error
    useEffect(() => {
        if (scoresError) {
            setSnackbarMessage(`Error: ${scoresError}`);
            setSnackbarVisible(true);
            dispatch(clearScoreError());
        }
    }, [scoresError, dispatch]);

    // Initialize scores state
    const [scores, setScores] = useState<{ [key: string]: string }>(() => {
        // Initialize from playerScores on mount
        const initialScores: { [key: string]: string } = {};
        playerScores.forEach(score => {
            const matches = score.playerId.match(/[A-Z]+/);
            const team = matches ? matches[0] : '';
            const position = score.playerId.replace(team, '');
            if (team && position) {
                // Convert 0 to "0" string, not empty string
                initialScores[`${team}-${position}`] = score.runs !== undefined && score.runs !== null ? score.runs.toString() : '';
            }
        });
        return initialScores;
    });

    // Update scores when playerScores changes
    useEffect(() => {
        setScores(prevScores => {
            const newScores = { ...prevScores };
            playerScores.forEach(score => {
                const matches = score.playerId.match(/[A-Z]+/);
                const team = matches ? matches[0] : '';
                const position = score.playerId.replace(team, '');
                if (team && position) {
                    newScores[`${team}-${position}`] = score.runs !== undefined && score.runs !== null
                        ? score.runs.toString()
                        : '';
                }
            });
            return newScores;
        });
    }, [playerScores]);

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const scrollToInput = useCallback((y: number) => {
        scrollViewRef.current?.scrollTo({
            y: y,
            animated: true
        });
    }, []);

    const handleScoreChange = useCallback((team: string, position: number, value: string) => {
        if (value === '' || /^\d+$/.test(value)) {
            const key = `${team}-${position}`;
            setScores(prev => ({
                ...prev,
                [key]: value
            }));
        }
    }, []);

    const handleSaveScores = useCallback(async () => {
        const updatedScores = Object.entries(scores)
            .map(([key, runs]) => {
                const [team, position] = key.split('-');
                return {
                    id: `${matchId}-${team}-${position}`,
                    matchId,
                    playerId: `${team}${position}`,
                    runs: runs === '' ? undefined : parseInt(runs, 10)
                };
            }) as PlayerScore[];

        try {
            setSnackbarMessage('Updating scores...');
            setSnackbarVisible(true);

            // Use the async action that will update Google Sheets
            await dispatch(updatePlayerScoresAsync(updatedScores)).unwrap();

            setSnackbarMessage('Scores updated successfully!');
            setSnackbarVisible(true);

            // Wait a short moment to show the success message
            setTimeout(() => {
                // Simply go back to previous screen without setting any flags
                navigation.goBack();
            }, 1000);
        } catch (error) {
            console.error('Error saving scores:', error);
            setSnackbarMessage('Error updating scores. Please try again.');
            setSnackbarVisible(true);
        }
    }, [scores, matchId, dispatch, navigation, setSnackbarMessage, setSnackbarVisible]);

    const handleFetchFromGoogleSheets = useCallback(async () => {
        try {
            const resultAction = await dispatch(fetchMatchData(matchId));

            if (fetchMatchData.fulfilled.match(resultAction)) {
                const matchData = resultAction.payload;

                console.log("Scores - Match Teams:", match?.teamA, match?.teamB);

                // Update the scores state with data from Google Sheets
                const newScores = { ...scores };

                matchData.playerAssignments.forEach((assignment: PlayerPosition) => {
                    console.log(`Processing scores for ${assignment.member}:`, {
                        p1: assignment.p1,
                        p1Score: assignment.p1Score,
                        p2: assignment.p2,
                        p2Score: assignment.p2Score,
                        total: assignment.total
                    });

                    // Process positions and scores
                    const processPosition = (positionCode: string | null, score: number | null | undefined) => {
                        if (!positionCode) return;

                        const team = positionCode.match(/[A-Z]+/)?.[0] || '';
                        const positionStr = positionCode.replace(team, '');
                        const position = parseInt(positionStr, 10);

                        if (!team || !position || position <= 0 || position > MAX_PLAYERS) {
                            console.log(`Invalid position format: ${positionCode}`);
                            return;
                        }

                        if (team !== match?.teamA && team !== match?.teamB) {
                            console.log(`Team code ${team} doesn't match either match team: ${match?.teamA}, ${match?.teamB}`);
                            return;
                        }

                        console.log(`Setting score for ${team}-${position} to ${score}`);
                        const key = `${team}-${position}`;

                        // Only set the score if it exists in the spreadsheet
                        if (score !== undefined && score !== null) {
                            newScores[key] = score.toString();
                        } else {
                            // For empty spreadsheet cells, leave input blank
                            newScores[key] = '';
                        }
                    };

                    // Process both positions
                    if (assignment.p1) {
                        processPosition(assignment.p1, assignment.p1Score);
                    }

                    if (assignment.p2) {
                        processPosition(assignment.p2, assignment.p2Score);
                    }
                });

                setScores(newScores);
                setSnackbarMessage('Scores loaded from Google Sheets');
                setSnackbarVisible(true);
            } else {
                setSnackbarMessage('Failed to load scores from Google Sheets');
                setSnackbarVisible(true);
            }
        } catch (error) {
            console.error('Error syncing scores from Google Sheets:', error);
            setSnackbarMessage('Error syncing with Google Sheets');
            setSnackbarVisible(true);
        }
    }, [matchId, dispatch, match, scores, setScores, setSnackbarMessage, setSnackbarVisible]);

    const renderTeamScores = useCallback((team: typeof teamA, shortName: string) => {
        if (!team) return null;

        return (
            <Card style={styles.card}>
                <Card.Title
                    title={`${team.name} Players`}
                    titleStyle={styles.cardTitle}
                />
                <Divider />
                <Card.Content>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerPosition}>Position</Text>
                        <Text style={styles.headerPlayer}>Player</Text>
                        <Text style={styles.headerRuns}>Runs</Text>
                    </View>
                    <Divider />
                    {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                        const position = i + 1;
                        const key = `${shortName}-${position}`;
                        const currentScore = scores[key] || '';

                        return (
                            <View key={key} style={styles.playerRow}>
                                <Text style={styles.position}>{position}</Text>
                                <Text style={styles.playerName}>{`${shortName}${position}`}</Text>
                                <TextInput
                                    mode="outlined"
                                    value={currentScore}
                                    onChangeText={value => handleScoreChange(shortName, position, value)}
                                    keyboardType="numeric"
                                    style={styles.input}
                                    dense
                                    placeholder="-"
                                    disabled={scoresLoading}
                                />
                            </View>
                        );
                    })}
                </Card.Content>
            </Card>
        );
    }, [scores, handleScoreChange, scoresLoading]);

    const renderContent = () => (
        <View style={styles.contentContainer}>
            <Card style={styles.infoCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.infoText}>
                        Enter runs scored by each player
                    </Text>
                </Card.Content>
            </Card>

            <Button
                mode="outlined"
                icon="cloud-download"
                onPress={handleFetchFromGoogleSheets}
                style={styles.syncButton}
                loading={googleSheetsData.loading}
                disabled={googleSheetsData.loading || scoresLoading}
                textColor={COLORS.DARK}
                buttonColor={COLORS.WHITE}
            >
                Sync with Google Sheets
            </Button>

            {match && teamA && renderTeamScores(teamA, match.teamA)}
            {match && teamB && renderTeamScores(teamB, match.teamB)}

            <Button
                mode="contained"
                onPress={handleSaveScores}
                style={styles.button}
                disabled={scoresLoading}
                buttonColor={COLORS.DARK}
                textColor={COLORS.WHITE}
            >
                Save All Scores
            </Button>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    styles.scrollContent,
                    Platform.OS === 'android' && { paddingBottom: keyboardHeight + 100 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    {renderContent()}
                </TouchableWithoutFeedback>
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

            {scoresLoading && (
                <Portal>
                    <Modal
                        visible={true}
                        dismissable={false}
                        contentContainerStyle={styles.loadingModal}
                    >
                        <ActivityIndicator size="large" color="#006064" />
                        <Text style={styles.loadingText}>
                            Updating scores in spreadsheet...
                        </Text>
                    </Modal>
                </Portal>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: Platform.OS === 'ios' ? 120 : 0,
    },
    contentContainer: {
        flex: 1,
    },
    card: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: COLORS.LIME,
    },
    infoCard: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: COLORS.LIME,
    },
    infoText: {
        textAlign: 'center',
        color: COLORS.DARK,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerPosition: {
        width: 70,
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    headerPlayer: {
        flex: 1,
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    headerRuns: {
        width: 100,
        textAlign: 'center',
        fontWeight: 'bold',
        color: COLORS.DARK,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    position: {
        width: 70,
        color: COLORS.DARK,
    },
    playerName: {
        flex: 1,
        color: COLORS.DARK,
    },
    input: {
        width: 100,
        backgroundColor: COLORS.WHITE,
        borderRadius: 0,
    },
    button: {
        margin: 16,
        borderRadius: 0,
    },
    syncButton: {
        margin: 16,
        marginTop: 0,
        marginBottom: 8,
        backgroundColor: COLORS.WHITE,
        borderColor: COLORS.DARK,
        borderRadius: 0,
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

export default PlayerScoresScreen; 