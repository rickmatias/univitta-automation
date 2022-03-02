/**
 * Pega a pasta do paciente no Google Drive ou cria uma caso ainda não tenha
 * sido criada
 *
 * @param {PatientERow} patientERow a ERow da planilha 'Pacientes'
 * @returns {GoogleAppsScript.Drive.Folder} A pasta de exames do paciente
 */
function getOrCreatePatientFolder(patientERow){
  console.log('getOrCreatePatientFolder');
  const feegowId = patientERow.getFeegowId();
  const patientName = patientERow.getPatientName();

  const mainFolder = DriveApp.getFolderById(ALL_PATIENTS_FOLDER_ID);
  const readmeFile = DriveApp.getFileById(README_FILE_ID);

  let patientFolderIterator = mainFolder.searchFolders("title contains '"+feegowId + " - ' and trashed=false");

  /**@type GoogleAppsScript.Drive.Folder*/
  let patientFolder;

  let regex = new RegExp("^"+feegowId+" - ");

  while(patientFolderIterator.hasNext()){
    let foundFolder = patientFolderIterator.next();

    if(foundFolder.getName().match(regex))
      patientFolder = foundFolder;
  }

  if(!patientFolder){
    patientFolder = mainFolder.createFolder(feegowId + " - " + patientName);

    DriveApp.createShortcut(readmeFile.getId())
      .moveTo(patientFolder);
  }

  const patientFolderId = patientFolder.getId();

  const examFolderIterator = patientFolder.searchFolders("title contains 'Exames' and trashed=false");
  const otherFolderIterator = patientFolder.searchFolders("title contains 'Outros' and trashed=false");

  if(examFolderIterator.hasNext()){
    //Se tiver exame salvo na pasta, envia link para a pessoa
    if(examFolderIterator.next().getFiles().hasNext()){
      const {UnivittaMessenger} = UnivittaMessengerLib;
      const toNumber = patientERow.getPhoneNumber();
      UnivittaMessenger.sendCampaign(UnivittaMessenger.Campaign.CAMPAIGN_PATIENT_FOLDER, {patientName, toNumber, patientFolder});
    }
  }else{
    patientFolder.createFolder("Exames");
  }

  if(!otherFolderIterator.hasNext()){
    patientFolder.createFolder("Outros");
  }

  //Caso o ID da pasta esteja diferente na planilha 'Univitta Contatos', atualiza-o
  if (patientERow.getGoogleFolderId() != patientFolderId)
    patientERow.setGoogleFolderId(patientFolderId).save();

  createDocumentWithQRCodeOfPatientFolder(patientFolder);

  console.log('ending getOrCreatePatientFolder');
  return patientFolder;
}


/**
 * Esta função cria um arquivo (Google Documentos) contendo um link (QR Code) da
 * pasta principal de documentos do paciente
 *
 * @param {GoogleAppsScript.Drive.Folder} mainPatientFolder A pasta principal do paciente;
 */
function createDocumentWithQRCodeOfPatientFolder(mainPatientFolder){
  function getQRCodeAsBlobFromLink(link, size = "350x350") {
    return UrlFetchApp.fetch("https://chart.googleapis.com/chart", {
      method: "post",
      payload: {
        cht: "qr",
        chl: link,
        chs: size,
      },
    }).getBlob();
  }
  try{
    const imgBlob = getQRCodeAsBlobFromLink(mainPatientFolder.getUrl(), "300x300");

    let file;

    const fileWithQRCodeName = "Link para acessar esta pasta";

    let fileIterator = mainPatientFolder.getFilesByName(fileWithQRCodeName);

    if(fileIterator.hasNext()){
      //file = fileIterator.next().setTrashed(true);
      return;
    }

    //Cria o documento baseado no template
    file = DriveApp.getFileById(TEMPLATE_DOCUMENT_WITH_QRCODE_ID)
      .makeCopy(mainPatientFolder)
      .setName(fileWithQRCodeName);

    var doc = DocumentApp.openById(file.getId());

    let body = doc.getBody();

    let table = body.getTables()[0];

    let cell = table.getCell(0, 0);
    var style = {};
    style[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;

    let par = cell.getChild(0).asParagraph().setAttributes(style);

    par.appendInlineImage(imgBlob);


    cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);


    body.replaceText("{{nome_do_paciente}}", mainPatientFolder.getName().replace(/^[\d\s\-]+/, ""));
  }catch(e){
    console.log("Ocorreu um erro inesperado ao tentar criar o documento com o link da pasta com ID '" +
      mainPatientFolder.getId() + "'. Erro: " + e);
  }
}

/**
 * 1x/dia às 1:00am de segunda a sábado, remover todas as pastas que estão na pasta 'Pacientes do dia'
 */
function removeAllTodayPatientFolders(){
  const todayPatientsFolder = DriveApp.getFolderById(TODAY_PATIENTS_FOLDER_ID);

  const todayPatientsFilesIterator = todayPatientsFolder.getFiles();

  while(todayPatientsFilesIterator.hasNext())
    todayPatientsFilesIterator.next().setTrashed(true);
}

/**
 * Função recorrente que adiciona as pastas dos pacientes que serão atendidos no dia à pasta 'Pacientes do dia'
 * É executada a cada 30 minutos das 06:00 às 18:00 de segunda à sábado
 *
 * @returns {boolean}
 */
function movePatientsFoldersToTodayPatientsFolder(){
  const { UnivittaContacts } = UnivittaContactsLib;
  
  const startExec = new Date();

  const hour = startExec.getHours();

  //Se for antes das 06:00 ou depois das 18:00 ou dia de domingo, a função encerra precocemente
  if(hour < 6 || hour > 18 || startExec.getDay() == 0)
    return false;

  const todayPatientsFolder = DriveApp.getFolderById(TODAY_PATIENTS_FOLDER_ID);
  const allPatientsFolder = DriveApp.getFolderById(ALL_PATIENTS_FOLDER_ID);

  const sheetAllAppointments = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);
  const {SCHEDULED_CONFIRMED, ATTENDED, IN_SERVICE, WAITING} = FeegowAPI.Status;

  const condition = eRow => {
    return (
      [SCHEDULED_CONFIRMED, ATTENDED, IN_SERVICE, WAITING].includes(eRow.get("Status ID")) &&
      eRow.get("Data") &&
      Util.isSameDate(eRow.get("Data"), startExec) &&
      !eRow.get("Google Drive") &&
      eRow.get("Profissional ID") == FeegowAPI.DR_RICARDO_ID
    );
  };

  const appointmentsERows = ERow.getERowsByCondition(sheetAllAppointments, condition);

  for(let i = 0; i < appointmentsERows.length; i++){
    const appointmentERow = appointmentsERows[i];

    const feegowId = appointmentERow.get("Paciente ID");

    console.log('Processando ' + feegowId);

    let patientERow = UnivittaContacts.getPatientERowByFeegowId(feegowId);

    if(!patientERow){
      continue;
    }

    const patientFolder = getOrCreatePatientFolder(patientERow);

    //Cria um atalho para a pasta do paciente e coloca-o na pasta 'Paciente do dia'
    allPatientsFolder.createShortcut(patientFolder.getId())
      .moveTo(todayPatientsFolder);

    appointmentERow.set("Google Drive", "✔").save();

    if(Util.isFunctionAboutToTimeout(startExec, false))
      break;
  }
}
