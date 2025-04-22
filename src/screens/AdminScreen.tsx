import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, TextInput, Button, Divider } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updatePlayoffTeams, setAdmin } from '../store/slices/matchesSlice';
import { logout } from '../store/slices/userSlice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type AdminScreenProps = NativeStackScreenProps<RootStackParamList, 'Admin'>;

const AdminScreen = ({ navigation, route }: AdminScreenProps) => {
    const dispatch = useAppDispatch();
    const { matches } = useAppSelector(state => state.matches);

    const [teamUpdates, setTeamUpdates] = useState<{ [key: string]: { teamA?: string; teamB?: string } }>({});


    const handleUpdateTeams = (matchId: string) => {
        const update = teamUpdates[matchId];
        if (update) {
            dispatch(updatePlayoffTeams({
                matchId,
                teamA: update.teamA,
                teamB: update.teamB
            }));
            Alert.alert('Success', 'Teams updated successfully');
        }
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const playoffMatches = matches.filter(match => match.isPlayoff);

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Title title="Manage Playoff Matches" />
                <Card.Content>
                    <Text style={styles.note}>
                        Update team names for playoff matches once they are determined by the points table.
                    </Text>
                    <Divider style={styles.divider} />
                    {playoffMatches.map(match => (
                        <View key={match.id} style={styles.matchContainer}>
                            <Text style={styles.matchTitle}>{match.playoffType}</Text>
                            <Text style={styles.date}>{match.date}</Text>
                            <TextInput
                                mode="outlined"
                                label="Team A"
                                value={teamUpdates[match.id]?.teamA ?? match.teamA}
                                onChangeText={(text) => setTeamUpdates(prev => ({
                                    ...prev,
                                    [match.id]: { ...prev[match.id], teamA: text }
                                }))}
                                style={styles.input}
                                editable={true}
                            />
                            <TextInput
                                mode="outlined"
                                label="Team B"
                                value={teamUpdates[match.id]?.teamB ?? match.teamB}
                                onChangeText={(text) => setTeamUpdates(prev => ({
                                    ...prev,
                                    [match.id]: { ...prev[match.id], teamB: text }
                                }))}
                                style={styles.input}
                                editable={true}
                            />
                            <Button
                                mode="contained"
                                onPress={() => handleUpdateTeams(match.id)}
                                style={styles.button}
                            >
                                Update Teams
                            </Button>
                            <Divider style={styles.divider} />
                        </View>
                    ))}
                </Card.Content>
            </Card>
            <Button
                mode="outlined"
                onPress={handleLogout}
                style={styles.logoutButton}
                icon="logout"
            >
                Logout
            </Button>
            <Button
                mode="contained"
                onPress={() => navigation.navigate('Home')}
                style={styles.homeButton}
                icon="home"
            >
                Go to Home
            </Button>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    card: {
        margin: 16,
    },
    input: {
        marginVertical: 8,
    },
    button: {
        marginTop: 16,
    },
    logoutButton: {
        margin: 16,
        marginTop: 0,
        marginBottom: 8,
    },
    divider: {
        marginVertical: 16,
    },
    matchContainer: {
        marginBottom: 16,
    },
    matchTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    date: {
        color: '#666',
        marginBottom: 8,
    },
    note: {
        fontStyle: 'italic',
        color: '#666',
        marginBottom: 16,
    },
    homeButton: {
        margin: 16,
        marginTop: 0,
        backgroundColor: '#4CAF50',
    }
});

export default AdminScreen; 