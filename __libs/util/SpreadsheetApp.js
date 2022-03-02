//Dependências:
//Parameters.js
//Drive.js
//Vars.js

/**
 * Função retorna um objeto contendo 2 parâmetros:
 * sheetName (String) e ssId (String)
 * @param {Sheet} sheet
 */
Util.getSheetInfo = function(sheet){
  return {
    sheetName: sheet.getName(),
    ssId: sheet.getParent().getId()
  }
}

/**
 * Função limpa o conteúdo de células com fórmulas e depois
 * as reinsere de volta
 * @param {Range} range
 */
Util.limpaRangeComFormulas = function(range){
  let formulas = range.getFormulas();
  range.clearContent();
  range.setFormulas(formulas);
}

/**
 * Função converte uma planilha (Sheet) em arquivo PDF
 * e retorna um objeto contendo:
 * "id" : o id do arquivo PDF no Google Drive
 * "viewUrl" : o link para visualização do arquivo PDF
 * "downloadUrl" : o link para download do arquivo PDF
 *
 * Based on Dr.Queso's answer
 * http://stackoverflow.com/questions/30367547/convert-all-sheets-to-pdf-with-google-apps-script/30492812#30492812
 *
 * @param {Sheet} sheet A planilha que servirá como template
 * @param {String} pdfName O nome do arquivo PDF a ser criado
 */
Util.convertSpreadsheetToPdf = function(sheet, pdfName) {
  SpreadsheetApp.flush();

  //ATENÇÃO! É necessário ativar a planilha (sheet)!
  sheet.activate();

  let ss = sheet.getParent();
  let ssId = ss.getId();
  let parents = DriveApp.getFileById(ssId).getParents();
  let folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();

  let url = ss.getUrl();

  let exportUrl = url.replace(/\/edit.*$/, '')
    + '/export?exportFormat=pdf&format=pdf'
    + '&size=A4'
    + '&portrait=true'
    + '&fitw=true'
    + '&top_margin=0.75'
    + '&bottom_margin=0.75'
    + '&left_margin=0.7'
    + '&right_margin=0.7'
    + '&sheetnames=false&printtitle=false'
    + '&pagenum=false'
    + '&gridlines=true'
    + '&fzr=FALSE'
    + '&gid=' + sheet.getSheetId();

  let response = UrlFetchApp.fetch(
    exportUrl,
    {
      headers: {
        Authorization: 'Bearer ' +  ScriptApp.getOAuthToken()
      }
    }
  );

  let blob = response.getBlob();
  blob = blob.setName(pdfName);

  let pdfFile = folder.createFile(blob);

  let fileId = pdfFile.getId();

  return {
    "id" : fileId,
    "viewUrl" : Util.getFileViewLink(fileId),
    "downloadUrl" : Util.getFileDownloadLink(fileId)
  };
}

Util.getColumnLetterByColumnIndex = function(i){
  if(i > 78){
    throw "Erro ao executar 'Util.getColumnLetterByColumnIndex': O índice da coluna não pode ser maior que 78."
  }
  let arr = ("A;B;C;D;E;F;G;H;I;J;K;L;M;N;O;P;Q;R;S;T;U;V;W;X;Y;Z;"+
    "AA;AB;AC;AD;AE;AF;AG;AH;AI;AJ;AK;AL;AM;AN;AO;AP;AQ;AR;AS;AT;AU;AV;AW;AX;AY;AZ;" +
    "BA;BB;BC;BD;BE;BF;BG;BH;BI;BJ;BK;BL;BM;BN;BO;BP;BQ;BR;BS;BT;BU;BV;BW;BX;BY;BZ")
    .split(";");
  return arr[i];
}

Util.getColumnLetterByColumnNumber = function(colNumber){
  const columnIndex = colNumber-1;
  return Util.getColumnLetterByColumnIndex (columnIndex);
}

Util.getRowNumberByColumnIndex = function(valueToSearch, columnIndex, sheet){
  SpreadsheetApp.flush();
  let dataRange = sheet.getDataRange();
  let data = dataRange.getValues();

  for (let i=(data.length-1);i>=0;i--){
    if(data[i][columnIndex]==valueToSearch) return i+1;
  }
  return false;
}

/**
 * Função devolve um array de objetos 'rowObject', os quais representam
 * os dados de uma linha na planilha (sheet). Esses objetos são filtrados
 * de acordo com a condição representada pelo parâmetro 'condition'
 * @param {Sheet} sheet A planilha de onde buscaremos as linhas
 * @param {Function} condition A função que filtra as linhas
 * @param {int} headersRowNumber O número da linha onde está o header
 *  (normalmente a primeira linha da planilha)
 * @param {boolean} keepFormulas Se verdadeiro, manteremos as fórmulas ao invés do seu resultado
 * @param {int} tries Tentativas realizadas na chamada do método
 * @returns {Object[]} Um array de objetos
 * @example
 * const sheet = Util.fastGetSheet(ssId, sheetName);
 * const condition = r => {r["colunaA"]=="valor"};
 * const rowObjects = Util.getRowsAsObjectsByCondition(sheet, condition, 1, true);
 * Util.log(rowObjects[0]["colunaB"]);
 * @throw Will throw an error if function is not able to get data after 5 tries
 */
Util.getRowsAsObjectsByCondition = function(sheet, condition, headersRowNumber=1, keepFormulas=true, tries=1){
  SpreadsheetApp.flush();
  try{
    let headerValues = Util.getHeaderRow(sheet);
    let dataRange = sheet.getDataRange();

    let arrOfRowObjects = dataRange.getValues().slice(headersRowNumber)
      .reduce((arr, row, rowIndex) => {
        arr.push(
            row.reduce((obj, col, colIndex)=> {
              if(headerValues[colIndex]){
                obj[headerValues[colIndex]] = col;
              }
              return obj;
            },{rowNumber: (rowIndex + headersRowNumber + 1)})
        );

        return arr;
      }, [])
      .filter(condition);

    if(arrOfRowObjects.length && keepFormulas){
      const formulasA1 = dataRange.getFormulas();
      const formulasR1C1 = dataRange.getFormulasR1C1();

      const formulas = formulasA1.map((row, rowIndex) => {
        return row.map((col, colIndex) => {
          return col ? col : formulasR1C1[rowIndex][colIndex];
        });
      });

      arrOfRowObjects = arrOfRowObjects.map(c => {
        const rowIndex = c["rowNumber"] - 1;

        return Object.keys(c).reduce((obj, key, index) => {
          const colIndex = index - 1;

          if(formulas[rowIndex][colIndex])
            obj[key] = formulas[rowIndex][colIndex];
          else
            obj[key] = c[key];

          return obj;
        }, {});
      });
    }
    return arrOfRowObjects;
  }catch(e){
    Util.log(e);
    if(tries <= 5)
      return Util.getRowsAsObjectsByCondition(sheet, condition, headersRowNumber, keepFormulas, ++tries);
    else
      throw "Não foi possível executar o método 'Util.getRowsAsObjectsByCondition' após 5 tentativas.";
  }
}

Util.getRowAsObject = function(rowNumber, headerRowNumber=1, sheet){
  SpreadsheetApp.flush();

  const headerValues = sheet.getRange(headerRowNumber+":"+headerRowNumber).getValues()[0];
  const columnNumber = sheet.getLastColumn();

  let rowData = sheet.getRange(rowNumber,1, 1, columnNumber).getValues()[0];

  rowData = rowData.reduce((obj, item, index) => {
    const key = headerValues[index];
    if(!Util.isEmpty(key))
      obj[key] = item;

    return obj;
  }, {"rowNumber": rowNumber});

  return rowData;
}

Util.getRowAsObjectByColumnIndex = function(valueToSearch, columnIndex, sheet){
  SpreadsheetApp.flush();

  let headerValues = sheet.getRange("1:1").getValues()[0];
  let dataRange = sheet.getDataRange();
  let data = dataRange.getValues();
  let row, rowNumber;

  for (let i=(data.length-1);i>=0;i--){
    rowNumber = i+1;
    if(data[i][columnIndex]==valueToSearch){
      row = data[i];

      return row.reduce((obj, item, index) => {
        obj[headerValues[index]] = item;
        return obj;
      }, {"rowNumber" : rowNumber});
    }
  }
  return false;
}

Util.getHeaderRow = function(sheet, headerRow=1){
  const {sheetName, ssId} = Util.getSheetInfo(sheet);

  const {cached} = Util.getHeaderRow;

  if (!(cached[ssId] && cached[ssId][sheetName])) {
    cached[ssId] = {};
    cached[ssId][sheetName] =
      sheet
        .getRange(headerRow, 1, 1, sheet.getMaxColumns())
        .getValues()[0];
  }
  return cached[ssId][sheetName];
}
Util.getHeaderRow.cached = {};

Util.getHeaderIndexes = function(sheet){
  const {sheetName, ssId} = Util.getSheetInfo(sheet);
  const {cached} = Util.getHeaderIndexes;

  if(!cached[ssId] || !cached[ssId][sheetName]){
    let range = sheet.getRange("1:1");
    let cols = range.getNumColumns();
    let data = range.getValues();
    let headerIndexes = {};

    for(let i=0; i<cols; i++){
      let val = data[0][i];
      if(val)
        headerIndexes[val] = i;
    }
    cached[ssId] = {};
    cached[ssId][sheetName] = headerIndexes;
  }
  return cached[ssId][sheetName];
}
Util.getHeaderIndexes.cached = {};

Util.getEditedRangeAsDataObject = function(e){
  const value = e.value;

  if(value === undefined)
    return {};

  const range = e.range;
  const oldValue = e.oldValue;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const rowNumber = range.getRow();
  const colNumber = range.getColumn();
  const rowIndex = rowNumber-1;
  const colIndex = colNumber -1;
  const colLetter = Util.getColumnLetterByColumnNumber(colNumber);
  const colHeader = Util.getHeaderRow(sheet)[colIndex];
  const columns = range.getNumColumns();
  const rows = range.getNumRows();
  const hasUniqueRow = rows==1;
  const hasUniqueCol = columns==1;
  const hasUniqueCel = hasUniqueRow && hasUniqueCol;

  return {
    value, oldValue, sheet, sheetName, range, rowNumber,
    rowIndex, colNumber, colIndex, colLetter, colHeader,
    columns, rows, hasUniqueRow, hasUniqueCol, hasUniqueCel
  };
}

Util.isRangeAInsideRangeB = function(rangeA, rangeB){
  let rangeACoordinates = {
    top: rangeA.getRow(),
    bottom: rangeA.getLastRow(),
    left: rangeA.getColumn(),
    right: rangeA.getLastColumn()
  };
  let rangeBCoordinates = {
    top: rangeB.getRow(),
    bottom: rangeB.getLastRow(),
    left: rangeB.getColumn(),
    right: rangeB.getLastColumn()
  };

  return(
    rangeACoordinates.top >= rangeBCoordinates.top &&
    rangeACoordinates.bottom <= rangeBCoordinates.bottom &&
    rangeACoordinates.left >= rangeBCoordinates.left &&
    rangeACoordinates.right <= rangeBCoordinates.right
  );
}

Util.getDataAsArrayOfObjects = function(arr, headerRow=null){
  let headersValues = Util.isEmpty(headerRow) ? arr.shift() : headerRow;

  return arr.map(function(row){
    return headersValues.reduce(function(obj, col, colIndex){
      obj[col]=row[colIndex] || null;
      return obj;
    },{})
  });
}

//transforma células de fórmula em valores
Util.removeFormulasFromRange = function(sheet, rangeA1){
  let range = sheet.getRange(rangeA1);
  range.copyTo(range, {contentsOnly:true});
}

/**
 * Convert Excel file to Sheets
 * @param {GoogleAppsScript.Base.Blob} excelFile The Excel file blob data; Required
 * @param {String} filename File name on uploading drive; Required
 * @param {Array} arrParents Array of folder ids to put converted file in; Optional, will default to Drive root folder
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} Converted Google Spreadsheet instance
 **/
Util.convertExcel2Sheets = function(excelFile, filename, arrParents) {
  let parents  = arrParents || []; // check if optional arrParents argument was provided, default to empty array if not
  if (!parents.isArray) parents = []; // make sure parents is an array, reset to empty array if not

  // Parameters for Drive API Simple Upload request (see https://developers.google.com/drive/web/manage-uploads#simple)
  let uploadParams = {
    method:'post',
    contentType: 'application/vnd.ms-excel', // works for both .xls and .xlsx files
    contentLength: excelFile.getBytes().length,
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    payload: excelFile.getBytes()
  };

  // Upload file to Drive root folder and convert to Sheets
  let uploadResponse = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v2/files/?uploadType=media&convert=true', uploadParams);

  // Parse upload&convert response data (need this to be able to get id of converted sheet)
  let fileDataResponse = JSON.parse(uploadResponse.getContentText());

  // Create payload (body) data for updating converted file's name and parent folder(s)
  let payloadData = {
    title: filename,
    parents: []
  };

  if ( parents.length ) { // Add provided parent folder(s) id(s) to payloadData, if any
    for ( let i=0; i<parents.length; i++ ) {
      try {
        DriveApp.getFolderById(parents[i]); // check that this folder id exists in drive and user can write to it
        payloadData.parents.push({id: parents[i]});
      }catch(e){} // fail silently if no such folder id exists in Drive
    }
  }
  // Parameters for Drive API File Update request (see https://developers.google.com/drive/v2/reference/files/update)
  let updateParams = {
    method:'put',
    headers: {'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()},
    contentType: 'application/json',
    payload: JSON.stringify(payloadData)
  };

  // Update metadata (filename and parent folder(s)) of converted sheet
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+fileDataResponse.id, updateParams);

  return Util.safelyOpenSpreadsheetById(fileDataResponse.id);
}

/**
 * Função deixa planilhas em cache para acessá-las mais rapidamente
 *
 * @param {String} ssId O ID da spreadsheet
 * @param {String} sheetName O nome da planilha (página)
 * @param {int} tries
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
Util.fastGetSheet = function(ssId, sheetName, tries=1){
  const {cached} = Util.fastGetSheet;
  try{
    if(!cached[ssId]){
      cached[ssId] = {};

      Util.safelyOpenSpreadsheetById(ssId).getSheets()
        .forEach(sheet => {
          const sheetName = sheet.getName();
          cached[ssId][sheetName] = sheet;
        });
    }
    return cached[ssId][sheetName];
  }catch(e){
    if(tries <= 10){
      Utilities.sleep(2000);
      return Util.fastGetSheet(ssId, sheetName, ++tries);
    }else{
      throw "Não foi possível abrir a planilha com ID '" + ssId + "' após 10 tentativas. Última mensagem de erro: " + e;
    }
  }
}
Util.fastGetSheet.cached = {};

Util.safelyOpenSpreadsheetById = function(ssId, tries=1){
  const {cached} = Util.safelyOpenSpreadsheetById;
  try{
    if(!cached[ssId]){
      cached[ssId] = SpreadsheetApp.openById(ssId);
    }
    return cached[ssId];
  }catch(e){
    if(tries <= 10){
      Utilities.sleep(2000);
      return Util.safelyOpenSpreadsheetById(ssId, ++tries);
    }else{
      throw `Não foi possível abrir a planilha com ID '${ssId}' após 10 tentativas. Erro: ${e}`;
    }
  }
}
Util.safelyOpenSpreadsheetById.cached = {};

Util.protectSheet = function(sheet, arrOfUnprotectedRanges=[]){
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
    .forEach(p => {
      if (p && p.canEdit())
        p.remove();
    });

  const protection = sheet.protect().setDescription('Proteção da página');
  protection.addEditor(SYSTEM_ADMIN_EMAIL);
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
  if(arrOfUnprotectedRanges && arrOfUnprotectedRanges.length){
    arrOfUnprotectedRanges = arrOfUnprotectedRanges.map(range => {
      if(Util.whatIsIt(range) == 'String')
        return sheet.getRange(range);

      return range;
    })
    protection.setUnprotectedRanges(arrOfUnprotectedRanges);
  }
}

Util.getColumnIndexByColumnName = function(sheet, columnName){
  const headerValues = Util.getHeaderRow(sheet);
  const colIndex = headerValues.indexOf(columnName);
  if (colIndex == -1) {
    const { sheetName } = Util.getSheetInfo(sheet);
    throw new Error(
      `Não existe coluna '${columnName}' na planilha '${sheetName}'`
    );
  }
  return colIndex;
}

Util.getColumnNumberByColumnName = function(sheet, columnName){
  return Util.getColumnIndexByColumnName(sheet, columnName) + 1;
};

Util.updateFilterViews = function (ssId) {
  Util.safelyOpenSpreadsheetById(ssId).getSheets().forEach(sheet => {
    const sheetName = sheet.getName();
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const sheetId = sheet.getSheetId();
    const filterViews = Sheets.Spreadsheets.get(ssId, {
      ranges: [sheetName],
      fields: "sheets(filterViews)",
    }).sheets[0].filterViews;
    if(filterViews && filterViews.length){
      const requests = filterViews.map((e) => ({
        updateFilterView: {
          filter: {
            filterViewId: e.filterViewId,
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: lastRow,
              startColumnIndex: 0,
              endColumnIndex: lastColumn,
            },
          },
          fields: "*",
        },
      }));
      Sheets.Spreadsheets.batchUpdate({ requests: requests }, ssId);
    }
  });
};