import axios from 'axios';

const API_KEY = 'AIzaSyCKU3JGwO--d65xPwxPUDPgtpgxJ8qtsro'; // Your API key from the URL
const SPREADSHEET_ID = '13ZVx9KujfS2-Iqvit76ed_cCKGardzA7ry_ad5goG3c';
const SHEET_NAME = 'Final';

export interface PlayerPosition {
    member: string;  // Member name (Ronak, Tilak, etc.)
    p1: string;      // Player 1 position (like R1, K7, etc.)
    p1Score: number | undefined; // Player 1 score
    p2: string;      // Player 2 position
    p2Score: number | undefined; // Player 2 score
    total: number;   // Total score
}

export interface ScoreUpdate {
    id: string;
    matchId: string;
    playerId: string;
    runs: number;
}

export interface MatchData {
    id: string;
    date: string;
    matchDetails: string;
    time: string;
    venue: string;
    winner: string;
    amount: string;
    playerAssignments: PlayerPosition[];
}

class GoogleSheetsService {
    // Google Sheets API base URL
    private apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    private apiKey = API_KEY;

    // Get data from the Google Sheet
    async getSheetData(): Promise<any> {
        try {
            // Use a clean URL without cache busting parameters
            const url = `${this.apiUrl}/values/${SHEET_NAME}?valueRenderOption=FORMATTED_VALUE&key=${this.apiKey}`;

            console.log('Fetching data from Google Sheets API');

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

            // Use headers to prevent caching
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            // Clear the timeout
            clearTimeout(timeoutId);

            // Log response status
            console.log('Google Sheets API response status:', response.status);

            if (!response.ok) {
                let errorMessage = `Google Sheets API error: ${response.status}`;

                // Try to get more details from the response
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage += ` - ${errorData.error.message || JSON.stringify(errorData.error)}`;
                    }
                    console.error('API Error Details:', errorData);
                } catch (e) {
                    // Ignore error parsing issues
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;
        } catch (error: any) {
            // Provide more detailed error logging
            if (error.name === 'AbortError') {
                console.error('Google Sheets API request timed out after 15 seconds');
                throw new Error('Request to Google Sheets timed out. Please check your network connection and try again.');
            } else if (error.message && error.message.includes('Network request failed')) {
                console.error('Network request to Google Sheets API failed:', error);
                throw new Error('Network request failed. Please check your internet connection and try again.');
            }

            console.error('Error fetching sheet data:', error);
            throw error;
        }
    }

    // Find the rowIndex for a given match ID
    findRowIndexForMatch(sheetData: any, matchId: string): number {
        const rows = sheetData.values;
        for (let i = 2; i < rows.length; i++) {
            if (rows[i][0] === matchId) {
                return i;
            }
        }
        return -1; // Not found
    }

    // Extract player assignments for a specific match
    getMatchAssignments(sheetData: any, matchId: string): PlayerPosition[] {
        const rowIndex = this.findRowIndexForMatch(sheetData, matchId);
        if (rowIndex === -1) return [];

        const row = sheetData.values[rowIndex];

        // Helper function to safely parse scores
        const parseScore = (value: any): number | undefined => {
            if (value === undefined || value === null || value === '') {
                return undefined;
            }

            // Handle string values
            if (typeof value === 'string') {
                value = value.trim();
                if (value === '' || value === '-') return undefined;
            }

            // Handle numeric values
            const parsed = parseInt(String(value), 10);

            // Just return NaN as undefined, but preserve 0 values
            if (isNaN(parsed)) return undefined;

            return parsed;
        };

        // Extract player assignments and scores
        const playerAssignments: PlayerPosition[] = [
            // Ronak
            {
                member: 'Ronak',
                p1: row[7] || '',
                p1Score: parseScore(row[8]),
                p2: row[9] || '',
                p2Score: parseScore(row[10]),
                total: parseScore(row[11]) || 0
            },
            // Tilak
            {
                member: 'Tilak',
                p1: row[12] || '',
                p1Score: parseScore(row[13]),
                p2: row[14] || '',
                p2Score: parseScore(row[15]),
                total: parseScore(row[16]) || 0
            },
            // Kishan
            {
                member: 'Kishan',
                p1: row[17] || '',
                p1Score: parseScore(row[18]),
                p2: row[19] || '',
                p2Score: parseScore(row[20]),
                total: parseScore(row[21]) || 0
            },
            // Mahavir
            {
                member: 'Mahavir',
                p1: row[22] || '',
                p1Score: parseScore(row[23]),
                p2: row[24] || '',
                p2Score: parseScore(row[25]),
                total: parseScore(row[26]) || 0
            },
            // Vishal
            {
                member: 'Vishal',
                p1: row[27] || '',
                p1Score: parseScore(row[28]),
                p2: row[29] || '',
                p2Score: parseScore(row[30]),
                total: parseScore(row[31]) || 0
            },
            // Yamik
            {
                member: 'Yamik',
                p1: row[32] || '',
                p1Score: parseScore(row[33]),
                p2: row[34] || '',
                p2Score: parseScore(row[35]),
                total: parseScore(row[36]) || 0
            },
            // Ravi
            {
                member: 'Ravi',
                p1: row[37] || '',
                p1Score: parseScore(row[38]),
                p2: row[39] || '',
                p2Score: parseScore(row[40]),
                total: parseScore(row[41]) || 0
            },
            // Rajesh
            {
                member: 'Rajesh',
                p1: row[42] || '',
                p1Score: parseScore(row[43]),
                p2: row[44] || '',
                p2Score: parseScore(row[45]),
                total: parseScore(row[46]) || 0
            }
        ];

        return playerAssignments;
    }

    // Map the API response to your app data model
    mapSheetDataToMatches(data: any): MatchData[] {
        const rows = data.values;
        // Skip header rows (0 and 1)
        const matches: MatchData[] = [];

        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];

            // Only process rows that have enough data
            if (row.length < 7) continue;

            // Helper function to safely parse scores
            const parseScore = (value: any): number | undefined => {
                if (value === undefined || value === null || value === '') {
                    return undefined;
                }

                // Handle string values
                if (typeof value === 'string') {
                    value = value.trim();
                    if (value === '' || value === '-') return undefined;
                }

                // Handle numeric values
                const parsed = parseInt(String(value), 10);

                // Just return NaN as undefined, but preserve 0 values
                if (isNaN(parsed)) return undefined;

                return parsed;
            };

            const match: MatchData = {
                id: row[0], // Match number
                date: row[1] || '',
                matchDetails: row[2] || '',
                time: row[3] || '',
                venue: row[4] || '',
                winner: row[5] || '',
                amount: row[6] || '210',

                // Player assignments and scores
                playerAssignments: [
                    // Ronak
                    {
                        member: 'Ronak',
                        p1: row[7] || '',
                        p1Score: parseScore(row[8]),
                        p2: row[9] || '',
                        p2Score: parseScore(row[10]),
                        total: parseScore(row[11]) || 0
                    },
                    // Tilak
                    {
                        member: 'Tilak',
                        p1: row[12] || '',
                        p1Score: parseScore(row[13]),
                        p2: row[14] || '',
                        p2Score: parseScore(row[15]),
                        total: parseScore(row[16]) || 0
                    },
                    // Kishan
                    {
                        member: 'Kishan',
                        p1: row[17] || '',
                        p1Score: parseScore(row[18]),
                        p2: row[19] || '',
                        p2Score: parseScore(row[20]),
                        total: parseScore(row[21]) || 0
                    },
                    // Mahavir
                    {
                        member: 'Mahavir',
                        p1: row[22] || '',
                        p1Score: parseScore(row[23]),
                        p2: row[24] || '',
                        p2Score: parseScore(row[25]),
                        total: parseScore(row[26]) || 0
                    },
                    // Vishal
                    {
                        member: 'Vishal',
                        p1: row[27] || '',
                        p1Score: parseScore(row[28]),
                        p2: row[29] || '',
                        p2Score: parseScore(row[30]),
                        total: parseScore(row[31]) || 0
                    },
                    // Yamik
                    {
                        member: 'Yamik',
                        p1: row[32] || '',
                        p1Score: parseScore(row[33]),
                        p2: row[34] || '',
                        p2Score: parseScore(row[35]),
                        total: parseScore(row[36]) || 0
                    },
                    // Ravi
                    {
                        member: 'Ravi',
                        p1: row[37] || '',
                        p1Score: parseScore(row[38]),
                        p2: row[39] || '',
                        p2Score: parseScore(row[40]),
                        total: parseScore(row[41]) || 0
                    },
                    // Rajesh
                    {
                        member: 'Rajesh',
                        p1: row[42] || '',
                        p1Score: parseScore(row[43]),
                        p2: row[44] || '',
                        p2Score: parseScore(row[45]),
                        total: parseScore(row[46]) || 0
                    }
                ]
            };

            matches.push(match);
        }

        return matches;
    }

    // NEW METHODS FOR UPDATING GOOGLE SHEETS

    // Get column index for member's score (based on position number)
    private getScoreCellReference(member: string, playerNum: 1 | 2): string | null {
        console.log(`Getting score cell reference for ${member}, player ${playerNum}`);

        // Based on the exact spreadsheet layout
        const memberScoreColumns: Record<string, Record<number, string>> = {
            'Ronak': {
                1: 'I', // Ronak P1 Score (column I)
                2: 'K'  // Ronak P2 Score (column K)
            },
            'Tilak': {
                1: 'N', // Tilak P1 Score (column N)
                2: 'P'  // Tilak P2 Score (column P)
            },
            'Kishan': {
                1: 'S', // Kishan P1 Score (column S)
                2: 'U'  // Kishan P2 Score (column U)
            },
            'Mahavir': {
                1: 'X', // Mahavir P1 Score (column X)
                2: 'Z'  // Mahavir P2 Score (column Z)
            },
            'Vishal': {
                1: 'AC', // Vishal P1 Score (column AC)
                2: 'AE'  // Vishal P2 Score (column AE)
            },
            'Yamik': {
                1: 'AH', // Yamik P1 Score (column AH)
                2: 'AJ'  // Yamik P2 Score (column AJ)
            },
            'Ravi': {
                1: 'AM', // Ravi P1 Score (column AM)
                2: 'AO'  // Ravi P2 Score (column AO)
            },
            'Rajesh': {
                1: 'AR', // Rajesh P1 Score (column AR)
                2: 'AT'  // Rajesh P2 Score (column AT)
            }
        };

        // Find the member (case-insensitive)
        const memberKey = Object.keys(memberScoreColumns).find(
            key => key.toLowerCase() === member.toLowerCase()
        );

        if (memberKey && memberScoreColumns[memberKey][playerNum]) {
            return memberScoreColumns[memberKey][playerNum];
        }

        console.error(`No score column mapping found for ${member}, player ${playerNum}`);
        return null;
    }

    // Get column index for member's position (P1 or P2)
    private getPositionCellReference(member: string, playerNum: 1 | 2): string | null {
        console.log(`Getting position cell reference for ${member}, player ${playerNum}`);

        // Based on the sheet layout as shown in the image
        const memberPositionColumns: Record<string, Record<number, string>> = {
            'Ronak': {
                1: 'H', // Ronak P1 (column H)
                2: 'J'  // Ronak P2 (column J)
            },
            'Tilak': {
                1: 'M', // Tilak P1 (column M)
                2: 'O'  // Tilak P2 (column O)
            },
            'Kishan': {
                1: 'R', // Kishan P1 (column R)
                2: 'T'  // Kishan P2 (column T)
            },
            'Mahavir': {
                1: 'W', // Mahavir P1 (column W)
                2: 'Y'  // Mahavir P2 (column Y)
            },
            'Vishal': {
                1: 'AB', // Vishal P1 (column AB)
                2: 'AD'  // Vishal P2 (column AD)
            },
            'Yamik': {
                1: 'AG', // Yamik P1 (column AG)
                2: 'AI'  // Yamik P2 (column AI)
            },
            'Ravi': {
                1: 'AL', // Ravi P1 (column AL)
                2: 'AN'  // Ravi P2 (column AN)
            },
            'Rajesh': {
                1: 'AQ', // Rajesh P1 (column AQ)
                2: 'AS'  // Rajesh P2 (column AS)
            }
        };

        // Find the member (case-insensitive)
        const memberKey = Object.keys(memberPositionColumns).find(
            key => key.toLowerCase() === member.toLowerCase()
        );

        if (memberKey && memberPositionColumns[memberKey][playerNum]) {
            return memberPositionColumns[memberKey][playerNum];
        }

        console.error(`No position column mapping found for ${member}, player ${playerNum}`);
        return null;
    }

    // Update player scores in Google Sheets
    async updatePlayerScores(matchId: string, scoreUpdates: ScoreUpdate[]): Promise<boolean> {
        try {
            console.log(`Updating scores for match ${matchId} in Google Sheets`, scoreUpdates);

            // First, get current data to find row index and member mappings
            const sheetData = await this.getSheetData();
            const rowIndex = this.findRowIndexForMatch(sheetData, matchId);

            if (rowIndex === -1) {
                console.error(`Match ID ${matchId} not found in spreadsheet`);
                return false;
            }

            // Current assignments to map player IDs to members and positions
            const currentAssignments = this.getMatchAssignments(sheetData, matchId);

            // Create a map of team positions to member info
            const positionToMemberMap = new Map<string, { member: string, playerNum: 1 | 2, currentScore: number | undefined }>();

            // Populate the map with current player positions and their scores
            for (const assignment of currentAssignments) {
                if (assignment.p1) {
                    positionToMemberMap.set(assignment.p1, {
                        member: assignment.member,
                        playerNum: 1,
                        currentScore: assignment.p1Score
                    });
                }
                if (assignment.p2) {
                    positionToMemberMap.set(assignment.p2, {
                        member: assignment.member,
                        playerNum: 2,
                        currentScore: assignment.p2Score
                    });
                }
            }

            // Prepare batch update data
            const cellUpdates: { cellRef: string, value: string }[] = [];

            for (const update of scoreUpdates) {
                // Extract team code and position from player ID
                const match = update.playerId.match(/([A-Z]+)(\d+)/);
                if (!match) {
                    console.error(`Invalid player ID format: ${update.playerId}`);
                    continue;
                }

                const [, teamCode, position] = match;
                const playerPosition = `${teamCode}${position}`;

                // Find which member has this position
                const memberInfo = positionToMemberMap.get(playerPosition);
                if (!memberInfo) {
                    console.error(`No member found with position ${playerPosition}`);
                    continue;
                }

                // Compare with current score to see if update is needed
                if (memberInfo.currentScore === update.runs) {
                    console.log(`Score for ${memberInfo.member}, player ${memberInfo.playerNum} already set to ${update.runs}, skipping update`);
                    continue;
                }

                // Get the cell reference for this member's score
                const columnLetter = this.getScoreCellReference(memberInfo.member, memberInfo.playerNum);
                if (!columnLetter) continue;

                // Use the column letter directly with the row number
                const cellRef = `${columnLetter}${rowIndex + 1}`;

                // Add to cellUpdates
                cellUpdates.push({
                    cellRef,
                    value: update.runs.toString()
                });

                console.log(`Will update score for ${memberInfo.member}, player ${memberInfo.playerNum} to ${update.runs} at cell ${cellRef}`);
            }

            // If no valid updates, return
            if (cellUpdates.length === 0) {
                console.warn('No changed scores to update in Google Sheets');
                return true; // Still return success since there's nothing to update
            }

            console.log(`Batch updating ${cellUpdates.length} changed scores`);

            // Perform batch update
            try {
                await this.updateMultipleCells(SHEET_NAME, cellUpdates);
                console.log('Successfully updated all scores in batch');

                // If updates were successful, invalidate the cache by adding a small delay
                // and then re-fetching the latest data to ensure the app has the most recent values
                console.log('Refreshing sheet data after successful update');

                // Add a small delay to ensure Google Sheets has processed the update
                await new Promise(resolve => setTimeout(resolve, 500));

                // Fetch fresh data to ensure we have the latest values
                try {
                    // Clear any cached data by using new AbortController for the next request
                    await this.getSheetData();
                    console.log('Successfully refreshed sheet data after update');
                } catch (refreshError) {
                    console.error('Failed to refresh sheet data after update:', refreshError);
                    // Don't fail the overall operation if just the refresh fails
                }

                return true;
            } catch (err) {
                console.error('Failed to update scores in batch:', err);
                return false;
            }

        } catch (error: any) {
            console.error('Error updating player scores in Google Sheets:', error);
            throw new Error(`Error updating player scores in Google Sheets: ${error.message}`);
        }
    }

    // Update player assignments in Google Sheets
    async updatePlayerAssignments(matchId: string, member: string, p1Position: string, p2Position: string): Promise<boolean> {
        try {
            console.log(`Updating assignments for member ${member} in match ${matchId}`);

            // First, get current data to find row index
            const sheetData = await this.getSheetData();
            const rowIndex = this.findRowIndexForMatch(sheetData, matchId);

            if (rowIndex === -1) {
                console.error(`Match ID ${matchId} not found in spreadsheet`);
                return false;
            }

            // Get cell references for this member's positions
            const p1ColumnLetter = this.getPositionCellReference(member, 1);
            const p2ColumnLetter = this.getPositionCellReference(member, 2);

            if (!p1ColumnLetter || !p2ColumnLetter) {
                console.error(`Could not find column indices for member ${member}`);
                return false;
            }

            const p1CellRef = `${p1ColumnLetter}${rowIndex + 1}`;
            const p2CellRef = `${p2ColumnLetter}${rowIndex + 1}`;

            console.log(`Will update positions for ${member}: P1=${p1Position} at ${p1CellRef}, P2=${p2Position} at ${p2CellRef}`);

            // Prepare batch update for both cells
            const cellUpdates = [
                { cellRef: p1CellRef, value: p1Position },
                { cellRef: p2CellRef, value: p2Position }
            ];

            // Perform batch update
            try {
                await this.updateMultipleCells(SHEET_NAME, cellUpdates);
                console.log(`Successfully updated positions for ${member}`);
                return true;
            } catch (err) {
                console.error(`Failed to update positions for ${member}:`, err);
                return false;
            }

        } catch (error: any) {
            console.error('Error updating player assignments in Google Sheets:', error);
            throw new Error(`Error updating player assignments in Google Sheets: ${error.message}`);
        }
    }

    // Helper method to update multiple cells in the Google Sheet in a single request
    private async updateMultipleCells(sheetName: string, cellUpdates: { cellRef: string, value: string }[]): Promise<void> {
        try {
            if (cellUpdates.length === 0) {
                console.log('No cells to update');
                return;
            }

            // If there's only one cell to update, use the single cell method
            if (cellUpdates.length === 1) {
                return this.updateSingleCell(sheetName, cellUpdates[0].cellRef, cellUpdates[0].value);
            }

            // YOUR APPS SCRIPT URL - Replace with your actual deployed script URL if different
            const updateUrl = `https://script.google.com/macros/s/AKfycbzN9oiCJxH8X2gBzXkRW4ryRSQAcclysxnEFArRBHmb-nIk5jgSqdE_XH5d7-AJjhLV/exec`;

            console.log(`Batch updating ${cellUpdates.length} cells in ${sheetName}`);

            // Prepare data for batch update
            const updates = cellUpdates.map(update => ({
                cell: update.cellRef,
                value: update.value
            }));

            // Use URLSearchParams for clean parameter formatting
            const params = new URLSearchParams({
                spreadsheetId: SPREADSHEET_ID,
                sheetName: sheetName,
                batch: 'true',
                // Serialize the updates array to JSON and encode for URL
                updates: JSON.stringify(updates)
            });

            const queryString = params.toString();
            console.log(`Batch update request: ${updateUrl}?${queryString}`);

            // Use direct fetch with GET 
            const response = await fetch(`${updateUrl}?${queryString}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            console.log(`Batch update response status: ${response.status}`);

            // Try to log response details
            if (response.ok) {
                try {
                    const responseText = await response.text();
                    console.log('Batch update response text:', responseText);
                } catch (e) {
                    console.log('Could not parse response text:', e);
                }
            } else {
                console.error(`Failed batch update, status: ${response.status}`);
                try {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                } catch (e) {
                    console.error('Could not read error response');
                }
                throw new Error(`Batch update failed with status ${response.status}`);
            }
        } catch (error) {
            console.error(`Error in batch update:`, error);
            throw error;
        }
    }

    // Helper method to update a single cell in the Google Sheet
    private async updateSingleCell(sheetName: string, cellRef: string, value: string): Promise<void> {
        try {
            const range = `${sheetName}!${cellRef}`;
            // YOUR APPS SCRIPT URL - Replace with your actual deployed script URL if different
            const updateUrl = `https://script.google.com/macros/s/AKfycbzN9oiCJxH8X2gBzXkRW4ryRSQAcclysxnEFArRBHmb-nIk5jgSqdE_XH5d7-AJjhLV/exec`;

            console.log(`Updating cell ${range} with value: ${value}`);

            // Use URLSearchParams for clean parameter formatting
            const params = new URLSearchParams({
                spreadsheetId: SPREADSHEET_ID,
                sheetName: sheetName,
                cell: cellRef,
                value: value
            });

            const queryString = params.toString();
            console.log(`Request URL: ${updateUrl}?${queryString}`);

            // Use direct fetch with GET (no-cors will prevent seeing the response)
            const response = await fetch(`${updateUrl}?${queryString}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            console.log(`Cell update response status: ${response.status}`);

            // Try to log response details
            if (response.ok) {
                try {
                    const responseText = await response.text();
                    console.log('Update response text:', responseText);
                } catch (e) {
                    console.log('Could not parse response text:', e);
                }
            } else {
                console.error(`Failed to update cell ${cellRef}, status: ${response.status}`);
                try {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                } catch (e) {
                    console.error('Could not read error response');
                }
            }
        } catch (error) {
            console.error(`Error updating cell ${cellRef}:`, error);
            throw error;
        }
    }

    // Helper function to convert column index to column letter (1 = A, 2 = B, etc.)
    // Note: This function is not needed anymore since we're using direct column letters
    private columnToLetter(column: number): string {
        let letter = '';
        while (column > 0) {
            const remainder = (column - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            column = Math.floor((column - 1) / 26);
        }
        return letter;
    }
}

export default new GoogleSheetsService(); 