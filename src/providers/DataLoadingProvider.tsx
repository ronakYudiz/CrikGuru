import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSheetData } from '../store/slices/googleSheetsSlice';
import { updatePastMatchesStatus } from '../store/slices/matchesSlice';

interface DataLoadingProviderProps {
    children: React.ReactNode;
}

const MAX_RETRIES = 1; // Just one retry to avoid infinite loops
const FORCE_CONTINUE_TIMEOUT = 3000; // 3 seconds before forcing continue

const DataLoadingProvider: React.FC<DataLoadingProviderProps> = ({ children }) => {
    const dispatch = useAppDispatch();
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { loading, error, matches } = useAppSelector(state => state.googleSheets);
    const { isAuthenticated } = useAppSelector(state => state.user);

    // If we've shown the error UI at least once, flag that we've done so
    const [hasShownError, setHasShownError] = useState(false);

    // Add an initialization ref to avoid unnecessary retries
    const isInitializedRef = useRef(false);
    const isLoadingDataRef = useRef(false);
    const forceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasLoggedErrorRef = useRef(false);

    // Check for past matches and update their status as 'completed'
    useEffect(() => {
        if (isAuthenticated) {
            // Dispatch action to mark past matches as completed
            dispatch(updatePastMatchesStatus());
        }
    }, [dispatch, isAuthenticated]);

    // Force continue after a short timeout even if loading or error
    useEffect(() => {
        if (isAuthenticated && !initialLoadDone && (loading || error)) {
            // Set a timeout to allow the app to continue even if data loading is taking too long
            if (!forceTimeoutRef.current) {
                console.log(`Setting force continue timeout (${FORCE_CONTINUE_TIMEOUT}ms)`);
                forceTimeoutRef.current = setTimeout(() => {
                    console.log('Force timeout reached - allowing app to continue even with data loading issues');
                    setInitialLoadDone(true);
                }, FORCE_CONTINUE_TIMEOUT);
            }
        }

        return () => {
            if (forceTimeoutRef.current) {
                clearTimeout(forceTimeoutRef.current);
                forceTimeoutRef.current = null;
            }
        };
    }, [isAuthenticated, initialLoadDone, loading, error]);

    // Always let the app continue if the error persists
    useEffect(() => {
        if (error && !initialLoadDone && hasShownError) {
            // We've already shown the error once, let the app continue
            console.log('Error persists but we\'ve already shown error UI, continuing anyway');
            setInitialLoadDone(true);
        } else if (error && !initialLoadDone && !hasShownError) {
            // Flag that we've shown the error at least once
            setHasShownError(true);

            // Let the user continue after a longer delay to avoid confusion
            setTimeout(() => {
                if (!initialLoadDone) {
                    console.log('Auto-continuing after showing error UI');
                    setInitialLoadDone(true);
                }
            }, 5000); // 5 seconds
        }
    }, [error, initialLoadDone, hasShownError]);

    useEffect(() => {
        const loadInitialData = async () => {
            // Prevent concurrent loading attempts
            if (isLoadingDataRef.current) {
                console.log('Already loading data, skipping');
                return;
            }

            isLoadingDataRef.current = true;

            try {
                console.log('Preloading all match data...');
                const result = await dispatch(fetchSheetData()).unwrap();
                console.log('Successfully loaded all match data, count:', result.length);
                setInitialLoadDone(true);
                isLoadingDataRef.current = false;
                hasLoggedErrorRef.current = false;

                // Clear force timeout as data loaded successfully
                if (forceTimeoutRef.current) {
                    clearTimeout(forceTimeoutRef.current);
                    forceTimeoutRef.current = null;
                }
            } catch (err) {
                if (!hasLoggedErrorRef.current) {
                    console.error('Failed to preload match data:', err);
                    hasLoggedErrorRef.current = true;
                } else {
                    console.log('Suppressing repeated error logs');
                }

                isLoadingDataRef.current = false;

                // Only auto-retry up to MAX_RETRIES times with a short delay
                if (retryCount < MAX_RETRIES) {
                    const delay = 1500; // Just use a flat 1.5 second delay
                    console.log(`Will retry data load (attempt ${retryCount + 1}) in ${delay}ms`);
                    setRetryCount(prev => prev + 1);

                    // Use setTimeout to schedule the retry
                    setTimeout(() => {
                        console.log(`Executing retry #${retryCount + 1}`);
                        loadInitialData();
                    }, delay);
                } else {
                    console.log('Giving up after multiple retries');
                    // Allow the app to continue even with errors
                    setInitialLoadDone(true);
                }
            }
        };

        // Skip data loading if not authenticated (at login screen)
        if (!isAuthenticated) {
            // Allow login screen to show without data loading
            if (!initialLoadDone) {
                setInitialLoadDone(true);
            }
            return;
        }

        // Only run once during initialization or when explicitly triggered
        if ((!isInitializedRef.current || (isAuthenticated && retryCount > 0)) && !initialLoadDone && !isLoadingDataRef.current) {
            isInitializedRef.current = true;
            loadInitialData();
        }
    }, [dispatch, retryCount, initialLoadDone, isAuthenticated]);

    // Even if we have an error but also have some matches data, let the app continue
    useEffect(() => {
        if (matches && matches.length > 0 && !initialLoadDone) {
            console.log('We have matches data, letting app continue regardless of errors');
            setInitialLoadDone(true);
        }
    }, [matches, initialLoadDone]);

    const handleRetry = () => {
        console.log('Manual retry requested');
        setRetryCount(0);
        isLoadingDataRef.current = false;
        hasLoggedErrorRef.current = false;
        setInitialLoadDone(false);
        isInitializedRef.current = false;
    };

    const handleContinueAnyway = () => {
        console.log('User requested to continue anyway');
        setInitialLoadDone(true);
    };

    // Always render children on login screen, regardless of data loading status
    if (!isAuthenticated) {
        return <>{children}</>;
    }

    if (!initialLoadDone && loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#006064" />
                <Text style={{ marginTop: 16, textAlign: 'center' }}>Loading match data...</Text>
                <Text style={{ marginTop: 8, fontSize: 12, color: '#666', textAlign: 'center' }}>
                    This might take a moment
                </Text>
                <TouchableOpacity
                    onPress={handleContinueAnyway}
                    style={{
                        backgroundColor: '#607D8B',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 4,
                        marginTop: 16
                    }}
                >
                    <Text style={{ color: 'white' }}>Continue Without Loading</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (error && !initialLoadDone) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>
                    Error loading match data
                </Text>
                <Text style={{ marginBottom: 20, textAlign: 'center' }}>
                    {error.includes('Network')
                        ? 'Please check your internet connection.'
                        : error.includes('JSON')
                            ? 'There is an issue with the Google Sheets API connection.'
                            : 'There was a problem connecting to the data source.'}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
                    <TouchableOpacity
                        onPress={handleRetry}
                        style={{
                            backgroundColor: '#006064',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 4,
                            marginRight: 8
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleContinueAnyway}
                        style={{
                            backgroundColor: '#607D8B',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 4,
                            marginLeft: 8
                        }}
                    >
                        <Text style={{ color: 'white' }}>Continue Anyway</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return <>{children}</>;
};

export default DataLoadingProvider; 