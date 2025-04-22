import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Member } from '../../types';
import { INITIAL_MEMBERS } from '../../constants/initialData';

interface MembersState {
    members: Member[];
}

const initialState: MembersState = {
    members: INITIAL_MEMBERS
};

const membersSlice = createSlice({
    name: 'members',
    initialState,
    reducers: {
        addMember: (state, action: PayloadAction<Member>) => {
            state.members.push(action.payload);
        },
        updateMember: (state, action: PayloadAction<Member>) => {
            const index = state.members.findIndex(member => member.id === action.payload.id);
            if (index !== -1) {
                state.members[index] = action.payload;
            }
        },
        deleteMember: (state, action: PayloadAction<string>) => {
            state.members = state.members.filter(member => member.id !== action.payload);
        }
    }
});

export const { addMember, updateMember, deleteMember } = membersSlice.actions;
export default membersSlice.reducer; 