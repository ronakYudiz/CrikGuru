// Google Apps Script code to update cells in a Google Sheet
// Deploy this as a web app with "Execute as: Me" and "Who has access: Anyone" settings

function doGet(e) {
    try {
        // Set CORS headers for the preflight request
        const response = ContentService.createTextOutput();
        response.setMimeType(ContentService.MimeType.JSON);

        // Parse request parameters
        const params = e.parameter;
        const spreadsheetId = params.spreadsheetId;
        const sheetName = params.sheetName;

        // Open the spreadsheet
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            return response.setContent(JSON.stringify({
                success: false,
                error: `Sheet ${sheetName} not found`
            }));
        }

        // Check if this is a batch update
        if (params.batch === 'true' && params.updates) {
            return handleBatchUpdate(sheet, params.updates, response);
        } else if (params.cell && params.value !== undefined) {
            return handleSingleCellUpdate(sheet, params.cell, params.value, response);
        } else {
            return response.setContent(JSON.stringify({
                success: false,
                error: 'Missing required parameters'
            }));
        }
    } catch (error) {
        // Return error response
        const response = ContentService.createTextOutput();
        response.setMimeType(ContentService.MimeType.JSON);
        return response.setContent(JSON.stringify({
            success: false,
            error: error.toString()
        }));
    }
}

/**
 * Handle updating a single cell
 */
function handleSingleCellUpdate(sheet, cell, value, response) {
    try {
        // Get the range for the cell
        const range = sheet.getRange(cell);

        // Update the cell
        range.setValue(value);

        // Return success response
        return response.setContent(JSON.stringify({
            success: true,
            message: `Cell ${cell} updated successfully`
        }));
    } catch (error) {
        return response.setContent(JSON.stringify({
            success: false,
            error: `Failed to update cell ${cell}: ${error.toString()}`
        }));
    }
}

/**
 * Handle updating multiple cells in a batch
 */
function handleBatchUpdate(sheet, updatesJson, response) {
    try {
        // Parse the updates JSON
        const updates = JSON.parse(updatesJson);

        if (!Array.isArray(updates)) {
            return response.setContent(JSON.stringify({
                success: false,
                error: 'Updates parameter must be an array'
            }));
        }

        const results = [];

        // Process each update
        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];

            if (!update.cell || update.value === undefined) {
                results.push({
                    cell: update.cell || 'unknown',
                    success: false,
                    error: 'Cell reference or value missing'
                });
                continue;
            }

            try {
                // Get the range for the cell
                const range = sheet.getRange(update.cell);

                // Update the cell
                range.setValue(update.value);

                results.push({
                    cell: update.cell,
                    success: true
                });
            } catch (error) {
                results.push({
                    cell: update.cell,
                    success: false,
                    error: error.toString()
                });
            }
        }

        // Return the results
        return response.setContent(JSON.stringify({
            success: true,
            message: `Batch update processed with ${results.filter(r => r.success).length} successes and ${results.filter(r => !r.success).length} failures`,
            results: results
        }));
    } catch (error) {
        return response.setContent(JSON.stringify({
            success: false,
            error: `Failed to process batch update: ${error.toString()}`
        }));
    }
} 