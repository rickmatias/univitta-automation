function processResponsesInCOVIDForm(){
  const startExec = new Date();

  if(startExec.getHours() >= 12 || [0,6].includes(startExec.getDay())) return false;

  const form = FormApp.openById("1jkf0IzOpuMPRdJ9GLp1k_YyF05Jt68Ed5H1FMNa08Yg");

  const formResponses = form.getResponses();

  for(let i=0; i < formResponses.length; i++){
    let formResponse = formResponses[i];

    processFormCOVIDTestResponse(formResponse);
    form.deleteResponse(formResponse.getId());

    if(Util.isFunctionAboutToTimeout(startExec)) break;
  }
}

function processFormCOVIDTestResponse(formResponse){
  const formResponseObj = Util.getFormResponseAsObject(formResponse);
  const whatsapp = Util.getLocalNumber(formResponseObj["DDD"] + " " + formResponseObj["Celular"]);

  const patient = {
    fullName: formResponseObj["Nome completo do paciente"],
    responsibleName: formResponseObj["Nome do responsável"],
    birthday: formResponseObj["Data de Nascimento"],
    whatsapp: whatsapp
  };

  if(patient.responsibleName == "Próprio paciente")
    patient.responsibleName = patient.fullName;

  patient.firstName = Util.getFirstName(patient.fullName);

  const isSymptomatic = formResponseObj["Em que situação você encontra?"].match(/estou ou estive/i) ? true : false;
  const today = new Date();

  let subMessageSituation = "";

  let subMessagePCR = "*• RT-PCR para COVID-19 (exame padrão-ouro)*\n" +
    "(realizar a coleta {{PERÍODO_PCR}})\n";

  let subMessageIgTotal = "*• Pesquisa de anticorpos totais para COVID-19 (Ig total)*\n" +
    "(realizar a coleta {{PERÍODO_IG_TOTAL}})\n";

  let startDateToPCR,
    startDateToIgTotal,
    arrOfExams = [];

  try{
    let getProperPeriod = function(startDate, endDate = null){
      let today = new Date();
      let totalPeriod = "";

      if(startDate.valueOf() < today.valueOf())
        startDate = today;

      let startDateStr = Util.getDateFormated(startDate, "dd/mm/yyyy"),
        endDateStr;

      const startToday = Util.isSameDate(today, startDate);

      if(endDate && endDate.getMonth()){
        endDateStr = Util.getDateFormated(endDate, "dd/mm/yyyy");

        if(startDate.valueOf() > endDate.valueOf() && !Util.isSameDate(startDate, endDate)){
          throw "foi informada como data de início ("+startDateStr+") uma data posterior à data do fim ("+endDateStr+")";
        }

        totalPeriod = "em qualquer dia a partir do dia " + startDateStr + " até no máximo dia " + endDateStr;

        if(startToday){
          totalPeriod = "em qualquer dia a partir de hoje até no máximo dia " + endDateStr;

          if(Util.isSameDate(today, endDate))
            totalPeriod = "ainda hoje (último dia!!!)";

        }
      }else{
        totalPeriod = "em qualquer dia a partir do dia " + startDateStr;

        if(startToday)
          totalPeriod = "em qualquer dia a partir de hoje";
      }
      return totalPeriod;
    };

    if(isSymptomatic){
      const symptomsStart = Util.getDateFromString(formResponseObj["Quando seus sintomas se iniciaram?"]);

      const daysSinceSymptomsStart = today.getDate() - symptomsStart.getDate();

      if(daysSinceSymptomsStart < 0){
        throw "foi informada como data de início dos sintomas uma data no futuro ("+symptomsStart+")";
      }

      startDateToPCR = new Date(symptomsStart.getTime());
      startDateToIgTotal = Util.sumDate(symptomsStart, "7d");


      if(daysSinceSymptomsStart == 0){
        subMessageSituation = "Como seus sintomas iniciaram hoje";
        arrOfExams = ["PCR", "Ig total"];
      }else if(daysSinceSymptomsStart == 1){
        subMessageSituation = "Como seus sintomas iniciaram ontem";
        arrOfExams = ["PCR", "Ig total"];
      }else{
        subMessageSituation = "Como seus sintomas iniciaram há " + daysSinceSymptomsStart + " dias";
        if(daysSinceSymptomsStart > 7){
          arrOfExams = ["Ig total"];
        }else{
          arrOfExams = ["PCR", "Ig total"];
        }
      }
    }else{
      const personHadContactWithSickPeople = formResponseObj["Por que você quer fazer o teste?"].match(/Tive contato/) ? true : false;

      if(personHadContactWithSickPeople){
        const contactDate = Util.getDateFromString(formResponseObj["Quando foi o contato com a pessoa infectada?"]);
        const daysSinceContact = today.getDate() - contactDate.getDate();

        if(daysSinceContact < 0){
          throw "foi informada como data de contato com a pessoa infectada uma data no futuro ("+contactDate+")";
        }

        startDateToPCR = Util.sumDate(contactDate, "5d");
        startDateToIgTotal = Util.sumDate(contactDate, "15d");

        if(daysSinceContact == 0){
          subMessageSituation = "Como o seu contato com a pessoa infectada foi hoje";
          arrOfExams = ["PCR", "Ig total"];
        }else if(daysSinceContact == 1){
          subMessageSituation = "Como o seu contato com a pessoa infectada foi ontem";
          arrOfExams = ["PCR", "Ig total"];
        }else{
          subMessageSituation = "Como o seu contato com a pessoa infectada foi há " + daysSinceContact + " dias";
          if(daysSinceContact > 10){
            arrOfExams = ["Ig total"];
          }else{
            arrOfExams = ["PCR", "Ig total"];
          }
        }
      }else{
        arrOfExams = ["Ig total"];
        startDateToIgTotal = today;
        subMessageSituation = "Como você está sem sintomas e apenas quer saber se já teve contato com o vírus";
        subMessageIgTotal = subMessageIgTotal.replace("{{PERÍODO_IG_TOTAL}}", "em qualquer dia a partir de hoje e, " +
          "enquanto der negativo, é recomendado repetir esse exame a cada 7 a 10 dias até a pandemia passar");
      }
    }
    let subMessageExams = "";
    let estimates = [];
    let prices = [];

    if(arrOfExams.includes("PCR")){
      const endDateToPCR = Util.sumDate(startDateToPCR, "7d");
      subMessageExams += subMessagePCR.replace("{{PERÍODO_PCR}}", getProperPeriod(startDateToPCR, endDateToPCR));
      estimates.push("• RT-PCR: 4 dias.");
      prices.push("• RT-PCR: R$ R$ 292,52");
    }
    if(arrOfExams.includes("Ig total")){
      estimates.push("• Ig total: 2 dias.");
      prices.push("• Ig total: R$ R$ 127,50");

      if(!Util.isEmpty(subMessageExams))
        subMessageExams += "*OU*\n";

      subMessageExams += subMessageIgTotal.replace("{{PERÍODO_IG_TOTAL}}", getProperPeriod(startDateToIgTotal));
    }

    createSolicitation(patient, subMessageExams);

    const message1 = "Olá, " + Util.getFirstName(patient.fullName) + ", tudo bem? Espero que sim! 😊\n"+
      "Vim aqui te avisar que o Dr. Ricardo Matias, nosso clínico geral, analisou o seu caso quanto à indicação do " +
      "teste para COVID-19.";

    const message2 = subMessageSituation + ", ele sugeriu o seguinte:\n" +
      subMessageExams + "\n" +
      "*ATENÇÃO* ⚠️ \n" +
      "*Dr. Ricardo não recomenda a realização do famoso \"teste rápido\" porque não dá para confiar caso o resultado " +
      "seja negativo!*";

    const message3 = "*Confira nosso prazo de entrega:*\n" +
      estimates.join("\n") + "\n\n" +
      "*Valor do exame:*\n" +
      prices.join("\n") + "\n\n" +
      "💳 Parcelamos nossos exames laboratoriais em até 12x sem juros* (consulte bandeiras)\n" +
      "✅ À vista damos 5% de desconto";

    const message4 = "Ah! Dr. Ricardo já deixou o seu pedido aqui na recepção. Para quando posso agendar a sua coleta?";

    UnivittaMessenger.createMessage("(79) 99812-0768", patient.whatsapp, message1, today, null, UnivittaMessenger.PRIORITY_HIGH);
    UnivittaMessenger.createMessage("(79) 99812-0768", patient.whatsapp, message2, today, null, UnivittaMessenger.PRIORITY_HIGH);
    UnivittaMessenger.createMessage("(79) 99812-0768", patient.whatsapp, message3, today, null, UnivittaMessenger.PRIORITY_HIGH);
    UnivittaMessenger.createMessage("(79) 99812-0768", patient.whatsapp, message4, today, null, UnivittaMessenger.PRIORITY_MEDIUM);

    const campaignOptions = {
      fromNumber : UnivittaMessenger.NUMBER_UNIVITTA,
      toNumber : whatsapp,
      priority : UnivittaMessenger.PRIORITY_URGENT,
      sendAt : new Date(Util.sumDate(today, "1d").getTime())
    };

    UnivittaMessenger.sendCampaign(UnivittaMessenger.CAMPAIGN_BIOSECURITY_01, campaignOptions);
  }catch(e){
    if(e.match(/foi informada/i)){
      const messageToSend = patient.firstName + ", não foi possível analisar as suas respostas no nosso formulário sobre " +
        "o teste para COVID-19 porque " + e + ". Se ainda tiver interesse, envie uma nova resposta. Segue o " +
        "link do formulário:\n" +
        "https://forms.gle/pAaahpYgUSTK5ReL6";

      UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, patient.whatsapp, messageToSend);
    }
    return false;
  }
}

function createSolicitation(patient, examsMessage){
  examsMessage = examsMessage.replace(/\*/g, "");
  let fileId = DriveApp.getFileById("15lg2AiFUhMopaMxLx3kS7yPPy06YhTkptxv_7NGeoCo").makeCopy().getId();
  let file = DriveApp.getFileById(fileId);
  file.setName(patient.fullName);

  var destFolder = DriveApp.getFolderById("1ulu5BZZeI_GDPt8dMf5k_xO7UQdRDiy1");
  destFolder.addFile(file);

  var body = DocumentApp.openById(fileId).getBody();
  body.replaceText("{{FULL_NAME}}", patient.fullName);
  body.replaceText("{{EXAMS}}", examsMessage);
  body.replaceText("{{DATE}}", Util.getDateFormated(new Date(), "dd/mm/yyyy"));
}