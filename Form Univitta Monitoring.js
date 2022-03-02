/**
 * Created by rickmatias on 26/05/20.
 */
/**
 * Created by rickmatias on 15/05/20.
 */
function formUnivittaMonitoringSubmitHandler(e){
  let sheetRegistrations = SpreadsheetApp.openById(UNIVITTA_MONITORING_SS_ID)
    .getSheetByName(UNIVITTA_MONITORING_REGISTER_SHEET_NAME),
    formResponse = e.response,
    form = e.source,
    formResponseObj = Util.getFormResponseAsObject(formResponse),
    firstName = Util.getFirstName(formResponseObj["Nome completo"]),
    uuid = Utilities.getUuid(),
    subject = "",
    messageToInsert = "";

  try{
    let fullNameOnForm = formResponseObj["Nome completo"];
    let birthDateOnForm = formResponseObj["Data de nascimento"];
    let respondentEmail = formResponse.getRespondentEmail().toLowerCase().trim();
    let feegowId = formResponseObj["Número de prontuário"] || null;
    let whatsApp = formResponseObj["Whatsapp"] || "";
    let city = formResponseObj["Cidade"] || "";
    let uf = formResponseObj["Estado"] || "";

    let monitorBloodGlucose = formResponseObj["O que você deseja monitorar?"].indexOf("Glicemia")>=0;
    let monitorBloodPressure = formResponseObj["O que você deseja monitorar?"].indexOf("Pressão")>=0;

    //Testa se já existe uma inscrição ativa para o email informado
    let hasSameEmail = c => c["E-mail"] == respondentEmail && Util.isEmpty(c["Data de conclusão"]);
    let eRows = ERowRow.getERowRowsByCondition(sheetRegistrations, hasSameEmail);

    if(eRows.length){
      throw "Já existe uma inscrição ativa para o email "+respondentEmail+".";
    }


    //Se o paciente informar número de prontuário, cruza dados informados com os dados no Feegow
    if(!Util.isEmpty(feegowId)){
      let patient = FeegowAPI.getPatientById(feegowId);

      if(patient){
        let birthDateOnFeegow = Util.getDateFromString(patient.nascimento);
        let birthDateOnFeegowStr = Util.getDateFormated(birthDateOnFeegow, "dd/mm/YYYY");
        let birtDateOnFormStr = Util.getDateFormated(birthDateOnForm, "dd/mm/YYYY");
        let fullNameOnFeegow = patient.nome;
        whatsApp = patient.whatsapp;
        city = patient.cidade || "";
        uf = patient.estado || "";

        if(birtDateOnFormStr != birthDateOnFeegowStr){

          throw "A data de aniversário informada ("+birtDateOnFormStr+") não corresponde a data encontrada no prontuário "+
          "do paciente. Por favor, entre em contato com o atendimento da Clínica Univitta para atualizar os seus dados e "+
          "tente novamente depois.";
        }
        if(fullNameOnForm != fullNameOnFeegow){
          throw "O nome do paciente informado ("+fullNameOnForm+") não corresponde ao nome encontrado no prontuário do "+
          "paciente! Por favor, entre em contato com o atendimento da Clínica Univitta para atualizar os seus dados e "+
          "tente novamente depois.";
        }
      }else{
        throw "Não foi nenhum paciente com o número de prontuário informado ("+feegowId+").";
      }
    }

    new ERowRow(sheetRegistrations.getParent().getId(), sheetRegistrations.getName())
      .set("Data de inscrição", formResponse.getTimestamp())
      .set("Nome completo", fullNameOnForm)
      .set("Número de prontuário", feegowId)
      .set("Nascimento", birthDateOnForm)
      .set("E-mail", respondentEmail)
      .set("WhatsApp", whatsApp)
      .set("Cidade", city)
      .set("Estado", uf)
      .set("Monitorar glicemia?", monitorBloodGlucose)
      .set("Monitorar PA?", monitorBloodPressure)
      .set("Código de ativação", uuid)
      .save();

    let link = "https://script.google.com/macros/s/AKfycbydQ5TGLIW06wLGi6RgoWMfCusc0Wb6spJ4OHL_Yw6_JquS-QlM/exec" +
      "?uuid=" + uuid + "&formId=" + form.getId();

    let endDateStr = Util.getDateFormated(Util.sumDate(new Date(), "2d"), "dd/mm/yyyy às hh:ii");

    messageToInsert = firstName + ", recebemos sua inscrição no nosso <b>Programa de Monitoramento de Glicemia e "+
      "Pressão Arterial</b>.<br>"+
      "Precisamos no entando que você confirme o seu e-mail clicando no botão abaixo:"+
      "<div style='padding: 30px 0; text-align: center'>" +
        "<a target='_blank' href='"+link+"' style='display: inline-block;margin: 0 auto; font-weight: bold;" +
          "letter-spacing: normal; line-height: 100%;text-align: center; text-decoration: none;" +
          "background-color: #ff9800;border: 1px solid #8C5800; color: #fff; padding: 20px 40px; border-radius: 4px; " +
          "text-transform: uppercase'>confirmar email</a>" +
      "</div>" +
      "<div style='font-size:14px;color: #b4b7b9; padding-top: 10px; border-top: 1px solid #efefef'>" +
        "Obs: sua inscrição será cancelada automaticamente caso não seja confirmada até "+endDateStr+"." +
      "</div>";

    subject = "Programa de Monitoramento de Glicemia e Pressão Arterial - Confirme sua inscrição";
  }catch(e){
    messageToInsert = firstName + ", não foi possível prosseguir com o seu cadastro no nosso <b>Programa de "+
      "Monitoramento de Glicemia e Pressão Arterial</b>.<br>" +
      "Motivo:<br>"+
      e + "<br><br>" +
      "Atenciosamente,<br>" +
      "Dr. Ricardo Matias<br>"+
      "Médico clínico e CEO da Clínica Univitta.";
    subject = "Não foi possível prosseguir com o seu cadastro no nosso Programa de Monitoramento";
  }finally{
    Util.sendTemplatedEmail(formResponse.getRespondentEmail().toLowerCase().trim(), subject, messageToInsert, "nao-responda@clinicaunivitta.com.br", true);
    form.deleteResponse(formResponse.getId());
  }
}