import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, StatusBar, Platform } from 'react-native';
import { Text, FAB, Portal, Button, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { RootStackParamList } from '../navigation';
import { useIsFocused } from '@react-navigation/native';
import MatchCard from '../components/MatchCard';
import { logout } from '../store/slices/userSlice';
import { fetchSheetData } from '../store/slices/googleSheetsSlice';
import { Match } from '../types';

type AdminHomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const AdminHomeScreen = ({ navigation }: AdminHomeScreenProps) => {
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState('upcoming');
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();

    const matches = useAppSelector(state => state.matches.matches,
        (prev, next) => prev.length === next.length &&
            prev.every((m, i) => m.id === next[i].id));

    const teams = useAppSelector(state => state.teams.teams,
        (prev, next) => prev.length === next.length &&
            prev.every((t, i) => t.id === next[i].id));

    // Get google sheets data
    const sheetData = useAppSelector(state => state.googleSheets.matches);

    // Fetch data only when there is no sheet data
    useEffect(() => {
        if (isFocused && (!sheetData || sheetData.length === 0)) {
            dispatch(fetchSheetData());
        }
    }, [isFocused, dispatch, sheetData]);

    // Separate matches into upcoming and completed
    const { upcomingMatches, completedMatches } = useMemo(() => {
        const completed = matches
            .filter(match => match.status === 'completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

        const upcoming = matches
            .filter(match => match.status !== 'completed')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Earliest first

        return { upcomingMatches: upcoming, completedMatches: completed };
    }, [matches]);

    const handleMatchPress = (matchId: string) => {
        navigation.navigate('MatchDetails', { matchId });
    };

    const handleLogout = () => {
        console.log('Logging out here in home');
        dispatch(logout());
    };

    return (
        <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
            <View style={[
                styles.header,
                { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30 }
            ]}>
                <Text style={styles.headerTitle}>Admin</Text>
                <Button
                    mode="outlined"
                    onPress={handleLogout}
                    icon="logout"
                    style={styles.logoutButton}
                    labelStyle={styles.logoutLabel}
                >
                    Logout
                </Button>
            </View>

            <SegmentedButtons
                value={activeTab}
                onValueChange={setActiveTab}
                style={styles.tabs}
                buttons={[
                    {
                        value: 'upcoming',
                        icon: 'calendar-clock',
                        label: 'Upcoming',
                        style: { borderRadius: 0 }
                    },
                    {
                        value: 'completed',
                        icon: 'calendar-check',
                        label: 'Completed',
                        style: { borderRadius: 0 }
                    },
                ]}
                theme={{
                    colors: {
                        secondaryContainer: '#21212F',
                        onSecondaryContainer: 'white',
                        outline: '#21212F',
                        primary: '#21212F',
                        primaryContainer: '#21212F',
                        surfaceVariant: '#ffffff',
                        onSurfaceVariant: '#21212F'
                    }
                }}
            />

            {activeTab === 'upcoming' ? (
                <FlatList
                    data={upcomingMatches}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            teams={teams}
                            onPress={() => handleMatchPress(item.id)}
                        />
                    )}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: 140 }]}
                    ListEmptyComponent={
                        <Text style={styles.noMatches}>No upcoming matches found</Text>
                    }
                />
            ) : (
                <FlatList
                    data={completedMatches}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            teams={teams}
                            onPress={() => handleMatchPress(item.id)}
                        />
                    )}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: 140 }]}
                    ListEmptyComponent={
                        <Text style={styles.noMatches}>No completed matches found</Text>
                    }
                />
            )}

            {isFocused && (
                <Portal>
                    <FAB
                        icon="medal"
                        style={[styles.fab, styles.leaderboardFab]}
                        onPress={() => navigation.navigate('Leaderboard')}
                        color="white"
                    />
                    <FAB
                        icon="account-cog"
                        style={[styles.fab, styles.adminFab]}
                        onPress={() => {
                            navigation.navigate('Admin', { skipLogin: true });
                        }}
                        color="white"
                    />
                </Portal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#CEF249',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logoutButton: {
        borderColor: '#21212F',
        borderRadius: 0,
    },
    logoutLabel: {
        color: '#21212F',
        fontSize: 13,
    },
    tabs: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: 'transparent',
        borderRadius: 0,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#21212F'
    },
    listContainer: {
        padding: 16,
    },
    noMatches: {
        textAlign: 'center',
        fontSize: 16,
        color: '#6c757d',
        marginTop: 32,
        fontStyle: 'italic',
    },
    fab: {
        position: 'absolute',
        right: 16,
        elevation: 4,
        borderRadius: 0,
    },
    leaderboardFab: {
        bottom: 86,
        backgroundColor: '#21212F',
    },
    adminFab: {
        bottom: 16,
        backgroundColor: '#21212F',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#21212F',
    },
});

export default AdminHomeScreen; 