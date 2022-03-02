/**
 * Esta função é executada a cada 30 minutos das 6:00 às 18:00
 * Ela pega os agendamentos no período compreendido entre 1 dia atrás e 2 dias à frente
 * e coloca-os na planilha de controle dos atendimentos.
 * Os agendamentos com status 'Atendido' tem suas datas informadas na planilha 'Univitta Contatos'
 */
function addAllAppointmentsToSheet(){
  const startExec = new Date();
  const hour = startExec.getHours();

  //Se for antes das 06:00 ou depois das 18:00 ou dia de domingo, a função encerra precocemente
  if(hour < 6 || hour > 18 || startExec.getDay() == 0)
    return false;

  let yesterday = Util.sumDate(startExec, "-1d");
  yesterday.setHours(0,0,1);

  let twoDaysFromToday = Util.sumDate(startExec, "2d");
  twoDaysFromToday.setHours(23,59,59);

  let appointments = FeegowAPI.getAppointments(yesterday, twoDaysFromToday);

  if(appointments && appointments.length > 0){
    const sheet = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);

    for(let i=0; i<appointments.length;i++){
      let appointment = appointments[i];
      let hasSameAppointmentId = eRow => eRow.get("Agendamento ID") == appointment.agendamento_id;
      let eRows = ERow.getERowsByCondition(sheet, hasSameAppointmentId);
      let eRow;

      const appointmentWasFound = eRows.length > 0;

      if(appointmentWasFound){
        eRow = eRows[0];
      }else{
        const {ssId, sheetName} = Util.getSheetInfo(sheet);
        eRow = new ERow(ssId, sheetName);
        eRow.set("Agendamento ID", appointment.agendamento_id);
      }

      eRow
        .set("Procedimento ID", appointment.procedimento_id)
        .set("Nome do procedimento", appointment.procedimento.nome)
        .set("Profissional ID", appointment.profissional_id)
        .set("Paciente ID", appointment.paciente_id)
        .set("Data", appointment.objeto_data)
        .set("Status ID", appointment.status_id)
        .set("Status", appointment.status)
        .save();

      if (
        eRow.get("Status ID") == FeegowAPI.Status.ATTENDED &&
        eRow.get("Profissional ID" == FeegowAPI.DR_RICARDO_ID)
      ) {
        const { UnivittaContacts } = UnivittaContactsLib;

        let patientERow = UnivittaContacts.getPatientERowByFeegowId(
          eRow.get("Paciente ID")
        );

        if (patientERow){
          patientERow
            .setLastAppointment(eRow.get("Data"))
            .save();
        }
      }
    }
  }
}

function sendMessagesPostConsultation(){
  const {UnivittaMessenger} = UnivittaMessengerLib;
  let startExec = new Date();

  const sheetAllAppointments = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);

  let condition = eRow =>
    !eRow.get("Pós-consulta")

  const eRows = ERow.getERowsByCondition(sheetAllAppointments, condition);

  for(let i=0; i < eRows.length; i++){
    let value;
    let success = false;
    let eRow = eRows[i];

    const appointmentDate = eRow.get("Data") || null;
    const status = eRow.get("Status");
    const feegowId = eRow.get("Paciente ID");
    const professionalId = eRow.get("Profissional ID");
    const appointmentId = eRow.get("Agendamento ID");

    if(
      Util.sumDate(appointmentDate, "5d") < startExec ||
      professionalId != FeegowAPI.DR_RICARDO_ID
    ){
      value = "-";
    }else if (status !== FeegowAPI.Status.ATTENDED) {
      continue;
    }else{
      let appointment = FeegowAPI.getAppointments(
        appointmentDate,
        appointmentDate,
        feegowId,
        professionalId,
        appointmentId
      );

      if (appointment && appointment[0]) {
        appointment = appointment[0];
        const campaignOptions = {
          toNumber: appointment.paciente.whatsapp,
          appointment,
        };

        success = UnivittaMessenger.sendCampaign(
          UnivittaMessenger.Campaign.CAMPAIGN_POS_CONSULTATION,
          campaignOptions
        );
        value = success ? "✔" : "-";
      }
    }

    eRow.set("Pós-consulta", value).save();

    if(Util.isFunctionAboutToTimeout(startExec)) break;
  }
}

/**
 * @deprecated Não faz mais sentido pois atendo
 */
// function sendMessageToNoShow(){
//   const template1 = "{{PRIMEIRO_NOME}}, Dr. Ricardo deixou um recado para você!";

//   const template2 = "Olá, {{PRIMEIRO_NOME}}, {{saudacao}}!" +
//     "Fiquei te aguardando na última {{1}} no horário agendado mas " +
//     "você não compareceu mesmo tendo confirmado. Peço, por favor, que isso não aconteça novamente, pois " +
//     "como atendo com hora marcada, fiquei impossibilitado de atender outra pessoa no seu lugar.\n\n" +
//     "Mas não se preocupe! Sei que imprevistos acontecem! E, caso queira reagendar seu atendimento, " +
//     "basta entrar em contato como nosso atendimento Whatsapp (é só clicar):\n" +
//     "wa.me/5579998120768\n\n" +
//     "Agradeço a compreensão!\n" +
//     "Atenciosamente,\n" +
//     "Dr. Ricardo Matias";

//   let today = new Date();
//   let consultDate = Util.sumDate(today, "-1d");

//   let condiction = c => {
//     return c["status_id"] == FeegowAPI.Status.NO_SHOW;
//   };

//   let services = FeegowAPI.getAppointments(consultDate, consultDate).filter(condiction);

//   if(services && services.length > 0){
//     for(let i=0; i<services.length;i++){
//       let service = services[i];
//       let patient = FeegowAPI.getPatientById(service.paciente_id);
//       let patientNumber = patient.whatsapp;
//       let procedureName = FeegowAPI.getProcedureById(service.procedimento_id).nome;

//       if(!Util.isEmpty(patientNumber) && !procedureName.match(/retorno/i)){
//         const weekDay = Util.getWeekDay(consultDate);
//         const message1 = UnivittaMessenger.getMessageFromTemplate(template1, patient);
//         const message2 = UnivittaMessenger.getMessageFromTemplate(template2, patient, weekDay);
//         UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA,patientNumber,message1,Util.sumDate(consultDate, "3d"), null, UnivittaMessenger.PRIORITY_MEDIUM);
//         UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA,patientNumber,message2,Util.sumDate(consultDate, "3d"), null, UnivittaMessenger.PRIORITY_MEDIUM);
//       }
//     }
//   }
// }

function sendMessagePreConsultation(startExec=new Date()){
  const {UnivittaMessenger} = UnivittaMessengerLib;

  if(!Util.isValidDate(startExec))
    startExec = new Date();

  let hour = startExec.getHours();
  if(hour >= 18 || hour <= 6) return false;

  const sheetAllAppointments = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);

  const appointmentLimitDate = Util.sumDate(startExec, "5d");
  appointmentLimitDate.setHours(23,59,59);

  let condition = (eRow) => !eRow.get("Pré-consulta");

  let eRows = ERow.getERowsByCondition(sheetAllAppointments, condition);

  for (let i = 0; i < eRows.length; i++){
    let value;
    let success = false;
    let eRow = eRows[i];

    const appointmentDate = eRow.get("Data") || null;
    const statusId = eRow.get("Status ID");
    const feegowId = eRow.get("Paciente ID");
    const professionalId = eRow.get("Profissional ID");
    const appointmentId = eRow.get("Agendamento ID");

    if(
      startExec > appointmentDate ||
      professionalId !== FeegowAPI.DR_RICARDO_ID
    ){
      value = "-"
    }else if(
      appointmentDate > appointmentLimitDate ||
      ![
        FeegowAPI.Status.SCHEDULED_CONFIRMED,
        FeegowAPI.Status.SCHEDULED_NOT_CONFIRMED
      ].includes(statusId)
    ){
      continue;
    }else{
      let appointment = FeegowAPI.getAppointments(
        appointmentDate,
        appointmentDate,
        feegowId,
        professionalId,
        appointmentId
      );

      if (appointment && appointment[0]) {
        appointment = appointment[0];
        let options = {
          toNumber: appointment.paciente.whatsapp,
          appointment: appointment,
        };
        success = UnivittaMessenger.sendCampaign(
          UnivittaMessenger.Campaign.CAMPAIGN_PRE_CONSULTATION,
          options
        );
        value = success ? "✔" : "-";
      }
    }
    eRow.set("Pré-consulta", value).save();

    if(Util.isFunctionAboutToTimeout(startExec)) break;
  }
}

/**
 * @deprecated
 */
// function sendMessageWarningCoronavirus(startExec=new Date()){
//   if(!Util.isValidDate(startExec))
//     startExec = new Date();

//   let hour = startExec.getHours();

//   if(hour >= 18 || hour <= 6) return false;

//   const sheetAllAppointments = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);

//   const appointmentLimitDate = Util.sumDate(startExec, "2d");
//   appointmentLimitDate.setHours(23,59,59);

//   const {SCHEDULED_CONFIRMED, SCHEDULED_NOT_CONFIRMED} = FeegowAPI.Status;

//   let condiction = c => {
//     return Util.isEmpty(c["Comunicado Coronavirus"]) &&
//       c["Data"] <= appointmentLimitDate &&
//       (
//         [SCHEDULED_CONFIRMED, SCHEDULED_NOT_CONFIRMED].includes(c["Status ID"])
//       );
//   };

//   let eRows = ERow.getERowsByCondition(sheetAllAppointments, condiction);

//   for (let i = 0; i < eRows.length; i++){
//     let success = false;

//     let eRow = eRows[i];

//     let appointment = FeegowAPI.getAppointments(
//       eRow.get('Data'),
//       eRow.get('Data'),
//       eRow.get("Paciente ID"),
//       eRow.get('Profissional ID'),
//       eRow.get('Agendamento ID')
//     );

//     if(appointment && appointment[0]){
//       appointment = appointment[0];
//       success = UnivittaMessenger.sendCampaign(
//         UnivittaMessenger.CAMPAIGN_WARNING_CORONAVIRUS_01,
//         {toNumber: appointment.paciente.whatsapp, appointment}
//       );
//     }
//     eRow.set("Comunicado Coronavirus", (success ? "✔" : "-")).save();

//     if(Util.isFunctionAboutToTimeout(startExec)) break;
//   }
// }

function queueSendMessageToScheduleNextAppointment(){
  const {Trellinator, ExecutionQueue} = TrellinatorLib;
  const sheet = Util.fastGetSheet(REPORTS_SS_ID, REPORT_RET_SCHEDULE_SHEET_NAME);

  //todo: mudar para ERow
  let arrOfRows = Util.getDataAsArrayOfObjects(
      sheet
      .getDataRange().getValues()
  ).filter(r => !Util.isEmpty(r["Prontuário"]) && !r["Próximo atendimento (tipo)"].match(/\-/) && !r["Próximo atendimento (intervalo)"].match(/\-/));

  for(let i=0; i < arrOfRows.length; i++){
    const row = arrOfRows[i];
    const params = {
      "feegowId" : row["Prontuário"],
      "patientName" : row["Paciente"],
      "currentAtdDate" : row["Data e Hora"],
      "nextAtdType" : row["Próximo atendimento (tipo)"].toLowerCase(),
      "nextAtdInterval" : row["Próximo atendimento (intervalo)"]
    };

    ExecutionQueue.push("sendMessageToScheduleNextAppointment", params, "sendMessageToScheduleNextAppointment", Trellinator.now())
  }
  sheet.getParent().deleteSheet(sheet);
}


function sendAnamnesisForm(){
  const { Trellinator, ExecutionQueue } = TrellinatorLib;

   let hour = (new Date()).getHours();
   //if(hour >= 18 || hour <= 6) return false;

  const sheetAllAppointments = Util.fastGetSheet(APPOINTMENTS_SS_ID, APPOINTMENTS_SHEET_NAME);

  let condition = eRow => Util.isEmpty(eRow.get("Formulário Anamnese"));

  ERow.getERowsByCondition(sheetAllAppointments, condition)
    .forEach(eRow => {
      let flag = false;
      if(
        eRow.get('Nome do procedimento').match(/consulta|telemonitoramento/i) &&
        [2,133,219,1401,1479,1513,1710,1815].includes(eRow.get('Paciente ID'))
      )
      {
        let appointment = FeegowAPI.getAppointments(
          eRow.get('Data'),
          eRow.get('Data'),
          eRow.get("Paciente ID"),
          eRow.get('Profissional ID'),
          eRow.get('Agendamento ID')
        );

        if(appointment && appointment[0]){
          appointment = appointment[0];

          ExecutionQueue.push(
            'UnivittaAnamnesis.sendAnamnesisForm',
            appointment,
            'UnivittaAnamnesis.sendAnamnesisForm-' + eRow.get('Agendamento ID'),
            Trellinator.now()
          );
          flag = true
        }
      }
      eRow.set("Formulário Anamnese", (flag ? "✔" : "-")).save();
    });
}