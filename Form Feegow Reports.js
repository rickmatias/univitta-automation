function formFeegowReportsSubmitHandler(e){
  const formResponse = e.response;
  const responseObj = Util.getFormResponseAsObject(formResponse);
  const respondentEmail = responseObj["Email"];
  const file = DriveApp.getFileById(responseObj["Relatório em formato  CSV"][0]);
  const mimeType = file.getMimeType();
  const isCSVFile =  mimeType == "text/csv";
  const isXLSXFile = mimeType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const reportType = responseObj["Qual o tipo de relatório?"];

  const insertReportSheet = function(sheetReportName, values){
    const spreadsheetReports = SpreadsheetApp.openById(REPORTS_SS_ID);
    const sheetReport = spreadsheetReports.getSheetByName(sheetReportName) || spreadsheetReports.insertSheet(sheetReportName);
    sheetReport.clearContents().clearFormats();
    sheetReport.getRange(1, 1, values.length, values[0].length).setValues(values);
    sheetReport.setFrozenRows(1);
  };

  try{
    if(!Util.isSameDate(new Date(file.getDateCreated()), new Date())){
      throw "O relatório precisa ser enviado no mesmo dia em que é gerado.";
    }

    let values = [];

    if(isCSVFile){
      values = Utilities.parseCsv(file.getBlob().getDataAsString(), ",");

      if(reportType.match(/pacientes/i)){
        insertReportSheet(REPORT_PATIENTS_SHEET_NAME, values);
        UnivittaContacts.createTrigger_updateAllPatientsFromFeegowReportSheet();
      }else if(reportType.match(/contas a receber/i)){
        insertReportSheet(REPORT_BILLS_TO_RECEIVE_SHEET_NAME, values);
        ProposalAppLib.createTrigger_updateAllExecutedProposalsFromFeegowReportSheet();
      }
    }else if(isXLSXFile){
      if(reportType.match(/retorno/i)){
        const folderId = file.getParents().next().getId();
        const ss = Util.convertExcel2Sheets(file.getBlob(), file.getName().replace(/\.[a-z]+$]/i, "gsheet"), [folderId]);

        values = ss.getSheets()[0].getDataRange().getValues();
        insertReportSheet(REPORT_RET_SCHEDULE_SHEET_NAME, values);
        queueSendMessageToScheduleNextAppointment();

        //Remove a spreadsheet recém criada
        DriveApp.getFileById(ss.getId()).setTrashed(true);
      }
    }else{
            throw "O relatório precisa ser enviado nos seguintes formatos: CSV e XLSX";
    }
  }catch(e){
    const sendMessage = "Houve um erro ao enviar o <b>relatório de pacientes</b>:<br>" +
        e + "<br><br>" +
        "Por favor, gere um novo relatório e envie novamente. Se você acha que pode ser um bug, " +
        "por favor encaminhe esse email para tecnologia@clinicaunivitta.com.br<br><br>" +
        "<a href='https://forms.gle/8RfxuHzjkqQuLhwA7'>Link do formulário para enviar novo relatório</a>";

    Util.sendTemplatedEmail(respondentEmail, "[URGENTE] Erro ao enviar o relatório do Feegow", sendMessage, "tecnologia@clinicaunivitta.com.br");
  }
  //Remove o arquivo enviado pelo formulário
  file.setTrashed(true);
  e.source.deleteResponse(formResponse.getId());
}