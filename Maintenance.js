function mergeAllDuplicatedPatientFolders(){
  Util.mergeDuplicateFolders = function (parentId, callback) {
    let parentFolder = DriveApp.getFolderById(parentId); //parent folder which will be scanned for duplicates
    let childFolderIterator = parentFolder.getFolders(); //all folders within parent folder

    //iteration over all folders in parent directory
    while (childFolderIterator.hasNext()) {
      let childFolder = childFolderIterator.next();
      let childFolderName = childFolder.getName();
      let childSameNameIterator =
        parentFolder.getFoldersByName(childFolderName);

      //just check if folder with given name exist (there should be at least one)
      if (childSameNameIterator.hasNext()) {
        let destFolder = childSameNameIterator.next();
        let hasDuplicates = false;

        //iteration over 2nd and all other folders with given name
        while (childSameNameIterator.hasNext()) {
          if (callback != null && !hasDuplicates) {
            hasDuplicates = true;
            callback(childFolder.getId());
          }

          let toMergeFolder = childSameNameIterator.next();
          let filesToMove = toMergeFolder.getFiles();
          let foldersToMove = toMergeFolder.getFolders();

          //iteration over all files
          while (filesToMove.hasNext()) {
            let file = filesToMove.next();
            toMergeFolder.removeFile(file);
            destFolder.addFile(file);
          }

          //iteration over all subfolders
          while (foldersToMove.hasNext()) {
            let folder = foldersToMove.next();
            toMergeFolder.removeFolder(folder);
            destFolder.addFolder(folder);
          }
          //trashes empty folder
          toMergeFolder.setTrashed(true);
        }
      }
    }
  };
  let callback = function(folderId){
    let folder = DriveApp.getFolderById(folderId);
    let folderName = folder.getName();
    let folderUrl = folder.getUrl();

    let patientId = parseInt(folderName.replace(/\D+$/, ""));
    let patient = FeegowAPI.getPatientById(patientId);
    let {nome, whatsapp} = patient;
    let firstName = Util.getFirstName(nome);

    let message1 = "Olá, "+firstName + ", tudo bem?\n"+
      "Dr. Ricardo acha muito importante deixar todos os documentos médicos organizados. " +
      "Segue abaixo um link de uma pasta do Google Drive onde daqui em diante nós salvaremos "+
      "todos os seus documentos importantes. Dessa forma você poderá acessá-los sempre que precisar.\n"+
      folderUrl + "\n\n" +
      "OBS1: lembre-se de que qualquer pessoa com esse link poderá acessá-los. Guarde-o num lugar seguro, ok?";

    let message2 = "Pode ser que você esteja recebendo essa mensagem pela segunda vez. Isso é porque houve um erro no sistema " +
      "e a sua pasta foi duplicada. Tivemos que juntar tudo em uma pasta só e o link acima é o que prevalecerá.\n\n" +
      "Atenciosamente,\n" +
      "Dr. Ricardo Matias";

    UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, whatsapp, message1, new Date());
    UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, whatsapp, message2, new Date());
  };
  Util.mergeDuplicateFolders(ALL_PATIENTS_FOLDER_ID, callback);
}

function informGoogleDriveFolderIdOnUnivittaContacts(){
  const { UnivittaContacts } = UnivittaContactsLib;

  let parentFolder = DriveApp.getFolderById(ALL_PATIENTS_FOLDER_ID);
  let childFolderIterator = parentFolder.getFolders();

  while(childFolderIterator.hasNext()){
    let childFolder = childFolderIterator.next();
    let childFolderName = childFolder.getName();
    let match = childFolderName.match(/^[\d]{2,}/);
    if(match){
      let patientId = parseInt(match[0]);
      let patientERow = UnivittaContacts.getPatientERowByFeegowId(patientId);

      if(patientERow){
        patientERow.setGoogleFolderId(childFolder.getId())
          .save();
      }
    }
  }
}

function informMissingAppointmentDates(){
  const sheetAllAppointments = SpreadsheetApp.openById(APPOINTMENTS_SS_ID)
    .getSheetByName(APPOINTMENTS_SHEET_NAME);

  let condiction = c => c["Data"] == "";
  let today = new Date();
  let consultStartDate = Util.sumDate(today, "-10d");
  let consultEndDate = Util.sumDate(today, "2d");

  let eRows = ERowRow.getERowRowsByCondition(sheetAllAppointments, condiction);
  let length = eRows.length;

  for (let i = 0; i < length; i++) {
    let eRow = eRows[i];
    let appointment = FeegowAPI.getAppointments(consultStartDate, consultEndDate, eRow.get("Paciente ID"), 1, eRow.get("Agendamento ID"));
    if(appointment && appointment.length==1){
      appointment = appointment[0];
      eRow.set("Data", appointment.objeto_data).save();
    }
  }
}
