import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, StatusBar, Platform } from 'react-native';
import { FAB, Portal, Button, SegmentedButtons } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/userSlice';
import { fetchSheetData } from '../store/slices/googleSheetsSlice';
import MatchCard from '../components/MatchCard';
import { Match } from '../types';
import { COLORS } from '../constants/colors';

type GuestHomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const GuestHomeScreen = ({ navigation }: GuestHomeScreenProps) => {
    const dispatch = useAppDispatch();
    const isFocused = useIsFocused();
    const [activeTab, setActiveTab] = useState('upcoming');
    const insets = useSafeAreaInsets();

    // Get matches data
    const matches = useAppSelector(state => state.matches.matches,
        (prev, next) => prev.length === next.length &&
            prev.every((m, i) => m.id === next[i].id));

    // Get google sheets data
    const sheetData = useAppSelector(state => state.googleSheets.matches);

    // Fetch data only when there is no sheet data
    useEffect(() => {
        if (isFocused && (!sheetData || sheetData.length === 0)) {
            dispatch(fetchSheetData());
        }
    }, [isFocused, dispatch, sheetData]);

    // Get teams data
    const teams = useAppSelector(state => state.teams.teams,
        (prev, next) => prev.length === next.length &&
            prev.every((t, i) => t.id === next[i].id));

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
        navigation.navigate('GuestMatchDetails', { matchId });
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
            <View style={[
                styles.header,
                { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30 }
            ]}>
                <Text style={styles.headerTitle}>IPL Dream League</Text>
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

            <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                    IPL Dream League 2025
                </Text>
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
                        secondaryContainer: COLORS.DARK,
                        onSecondaryContainer: COLORS.WHITE,
                        outline: COLORS.DARK,
                        primary: COLORS.DARK,
                        primaryContainer: COLORS.DARK,
                        surfaceVariant: COLORS.WHITE,
                        onSurfaceVariant: COLORS.DARK
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
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.noMatches}>No upcoming matches found</Text>
                        </View>
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
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.noMatches}>No completed matches found</Text>
                        </View>
                    }
                />
            )}

            {isFocused && (
                <Portal>
                    <FAB
                        icon="medal"
                        style={styles.fab}
                        onPress={() => navigation.navigate('Leaderboard')}
                        color={COLORS.WHITE}
                    />
                </Portal>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.LIME,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logoutButton: {
        borderColor: COLORS.DARK,
        borderRadius: 0,
    },
    logoutLabel: {
        color: COLORS.DARK,
        fontSize: 13,
    },
    infoCard: {
        margin: 16,
        marginBottom: 8,
        padding: 12,
        backgroundColor: COLORS.LIME,
        borderRadius: 0,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.DARK,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    infoText: {
        textAlign: 'center',
        color: COLORS.DARK,
        fontWeight: '500',
    },
    tabs: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: 'transparent',
        borderRadius: 0,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.DARK
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    noMatches: {
        textAlign: 'center',
        fontSize: 16,
        color: COLORS.DARK,
        marginTop: 20,
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 16,
        backgroundColor: COLORS.DARK,
        elevation: 4,
        borderRadius: 0,
    },
    headerTitle: {
        color: COLORS.DARK,
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default GuestHomeScreen; 