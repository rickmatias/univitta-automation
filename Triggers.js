/**
 * Created by rickmatias on 12/05/20.
 */
function createTrigger_sendBirthdayMessages(){
  let triggerFunctionName = "sendBirthdayMessages";
  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .timeBased()
      .atHour(6)
      .everyDays(1)
      .create();
  }
}

function createTrigger_sendMessagesPostConsultation(){
  let triggerFunctionName = "sendMessagesPostConsultation";
  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .timeBased()
      .atHour(6)
      .everyDays(1)
      .create();
  }
}

function createTrigger_formNPSSubmitHandler(){
  let triggerFunctionName = "formNPSSubmitHandler";
  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .forForm("1wTtjbWv3bRLXTh0WljCY8RKf5ozE7h3agMs1ZW1MCLI")
      .onFormSubmit()
      .create();
  }
}

// function createTrigger_sendMessageToNoShow(){
//   let triggerFunctionName = "sendMessageToNoShow";
//   if(!Util.triggerExist(triggerFunctionName)){
//     ScriptApp.newTrigger(triggerFunctionName)
//       .timeBased()
//       .atHour(6)
//       .everyDays(1)
//       .create();
//   }
// }

function createTrigger_formUnivittaMonitoringSubmitHandler(){
  let triggerFunctionName = "formUnivittaMonitoringSubmitHandler";
  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .forForm("1rKy88JGDmT3QAfYs-512dzyL0pSTCxolzGM1yQY56Co")
      .onFormSubmit()
      .create();
  }
}

function createTrigger_addAllAppointmentsToSheet(){
  Util.createTimeBasedTrigger(30, "addAllAppointmentsToSheet");
}

function createTrigger_sendMessagePreConsultation(){
  Util.createTimeBasedTrigger(30, "sendMessagePreConsultation");
}

// function createTrigger_sendMessageWarningCoronavirus(){
//   Util.createTimeBasedTrigger(30, "sendMessageWarningCoronavirus");
// }

function createTrigger_removeAllTodayPatientFolders(){
  let triggerFunctionName = "removeAllTodayPatientFolders";
  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .timeBased()
      .everyDays(1)
      .atHour(1)
      .create();
  }
}

function createTrigger_formFeegowReportsSubmitHandler(){
  const triggerFunctionName = "formFeegowReportsSubmitHandler";

  if(!Util.triggerExist(triggerFunctionName)){
    ScriptApp.newTrigger(triggerFunctionName)
      .forForm("1cyxBbDM0u6Z7l-PUPU9eVPTgi1fW01fT7pJr90WgcJU")
      .onFormSubmit()
      .create();
  }
}

function createTrigger_movePatientsFoldersToTodayPatientsFolder(){
  Util.createTimeBasedTrigger(30, "movePatientsFoldersToTodayPatientsFolder");
}

function createTrigger_processResponsesInCOVIDForm(){
  Util.createTimeBasedTrigger(30, "processResponsesInCOVIDForm");
}

function createTrigger_sendAnamnesisForm(){
  Util.createTimeBasedTrigger(30, "sendAnamnesisForm");
}

function createTrigger_createRoutineTasks(){
  Util.createTimeBasedTrigger(1, "createRoutineTasks", "hours");
}

function deleteAllTriggers() {
  Util.deleteAllTriggers();
}

function createAllTriggers(){
  deleteAllTriggers();
  createTrigger_sendBirthdayMessages();
  createTrigger_sendMessagesPostConsultation();
  createTrigger_formNPSSubmitHandler();
  createTrigger_formUnivittaMonitoringSubmitHandler();
  createTrigger_formFeegowReportsSubmitHandler();
  // createTrigger_sendMessageToNoShow();
  createTrigger_addAllAppointmentsToSheet();
  createTrigger_sendMessagePreConsultation();
  // createTrigger_sendMessageWarningCoronavirus();
  createTrigger_removeAllTodayPatientFolders();
  createTrigger_movePatientsFoldersToTodayPatientsFolder();
  createTrigger_processResponsesInCOVIDForm();
  createTrigger_sendAnamnesisForm();
  createTrigger_createRoutineTasks();
}