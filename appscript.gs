// This is a Google Apps Script file that should be deployed as a web app
// to handle Google Sheets updates from your React Native app

function doGet(e) {
  try {
    const params = e.parameter;
    
    // Check for single cell update request
    if (params.spreadsheetId && params.sheetName && params.cell && params.value !== undefined) {
      return updateSingleCell(params.spreadsheetId, params.sheetName, params.cell, params.value);
    }
    
    // Default response if no action specified
    return createCorsResponse(true, "The service is running. Please provide spreadsheetId, sheetName, cell, and value parameters.");
  } catch (error) {
    return createCorsResponse(false, "Error processing GET request: " + error.toString());
  }
}

function doPost(e) {
  try {
    // Parse the request data
    let data;
    
    // Check if data is coming as form-urlencoded
    if (e.postData.type === "application/x-www-form-urlencoded") {
      const formData = e.parameter;
      
      // Check for single cell update
      if (formData.spreadsheetId && formData.sheetName && formData.cell && formData.value !== undefined) {
        return updateSingleCell(formData.spreadsheetId, formData.sheetName, formData.cell, formData.value);
      }
      
      // Get the spreadsheet ID and sheet name from form parameters
      const spreadsheetId = formData.spreadsheetId;
      const sheetName = formData.sheetName;
      
      // Parse the updates JSON string
      let updates;
      try {
        updates = JSON.parse(formData.updates);
      } catch (error) {
        return createCorsResponse(false, "Failed to parse updates JSON: " + error.toString());
      }
      
      data = {
        spreadsheetId: spreadsheetId,
        sheetName: sheetName,
        updates: updates
      };
    } 
    // Check if data is coming as JSON
    else if (e.postData.type === "application/json") {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (error) {
        return createCorsResponse(false, "Failed to parse JSON request data: " + error.toString());
      }
    }
    else {
      return createCorsResponse(false, "Unsupported content type: " + e.postData.type);
    }
    
    // Validate required parameters
    if (!data.spreadsheetId) {
      return createCorsResponse(false, "Missing spreadsheetId");
    }
    
    if (!data.sheetName) {
      return createCorsResponse(false, "Missing sheetName");
    }
    
    if (!data.updates || !Array.isArray(data.updates) || data.updates.length === 0) {
      return createCorsResponse(false, "Missing or invalid updates array");
    }
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(data.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(data.sheetName);
    
    if (!sheet) {
      return createCorsResponse(false, "Sheet not found: " + data.sheetName);
    }
    
    // Apply updates
    let updatedCells = 0;
    let errors = [];
    
    for (const update of data.updates) {
      try {
        if (!update.cell || update.value === undefined) {
          errors.push(`Invalid update object: ${JSON.stringify(update)}`);
          continue;
        }
        
        sheet.getRange(update.cell).setValue(update.value);
        updatedCells++;
      } catch (err) {
        errors.push(`Error updating cell ${update.cell}: ${err.toString()}`);
      }
    }
    
    return createCorsResponse(true, `Updated ${updatedCells} cells`, { errors: errors });
    
  } catch (error) {
    return createCorsResponse(false, "Error processing request: " + error.toString());
  }
}

// Function to update a single cell - can be called from both GET and POST
function updateSingleCell(spreadsheetId, sheetName, cell, value) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return createCorsResponse(false, `Sheet not found: ${sheetName}`);
    }
    
    sheet.getRange(cell).setValue(value);
    return createCorsResponse(true, `Successfully updated cell ${cell} to value ${value}`);
  } catch (error) {
    return createCorsResponse(false, `Error updating cell ${cell}: ${error.toString()}`);
  }
}

// Helper function to send consistent JSON responses with CORS headers
function createCorsResponse(success, message, data) {
  const response = {
    success: success,
    message: message
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Handle preflight OPTIONS requests for CORS
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}

// Setup trigger to allow this script to run without authorization
function setup() {
  ScriptApp.newTrigger('doGet')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onOpen()
    .create();
}
