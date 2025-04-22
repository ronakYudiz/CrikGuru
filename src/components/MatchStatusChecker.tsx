import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updatePastMatchesStatus } from '../store/slices/matchesSlice';

const MatchStatusChecker: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAppSelector(state => state.user);

    useEffect(() => {
        // Only run this if the user is authenticated
        if (!isAuthenticated) return;

        // Update match statuses when component mounts
        dispatch(updatePastMatchesStatus());

        // Set up interval to check and update match statuses every hour
        const intervalId = setInterval(() => {
            dispatch(updatePastMatchesStatus());
        }, 60 * 60 * 1000); // 1 hour in milliseconds

        // Also update when app comes back to foreground
        const appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                dispatch(updatePastMatchesStatus());
            }
        });

        // Clean up
        return () => {
            clearInterval(intervalId);
            appStateListener.remove();
        };
    }, [dispatch, isAuthenticated]);

    // This component doesn't render anything
    return null;
};

export default MatchStatusChecker; 