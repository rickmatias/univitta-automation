/**
 * Created by rickmatias on 15/05/20.
 */
function formNPSSubmitHandler(e){
  let formResponse = e.response;

  let points = null,
    hash = null;

  let itemResponses = formResponse.getItemResponses();
  for (let j = 0; j < itemResponses.length; j++) {
    let itemResponse = itemResponses[j];

    let question = itemResponse.getItem().getTitle();
    let response = itemResponse.getResponse();

    if(question.match(/Hash/)){
      hash = response;
    }else if(question.match(/Em uma escala/)){
      points = response;
    }
  }

  if(points >= 7){
    let contactERows = UnivittaContacts.getContactERowRowByHashCode(hash);
    contactERows = contactERows.filter(function(c){
      return !Util.isEmpty(c.getFeegowId());
    });
    let len = contactERows.length;

    if(len > 0){
      let arrOfServices = [];
      let today = new Date();
      let startDate = Util.sumDate(today, "-30d");
      let endDate = new Date(formResponse.getTimestamp());
      for(let i = 0; i < len; i++){
        let patientERow = contactERows[i];
        let patientId = patientERow.get("Feegow ID");

        let services = FeegowAPI.getAppointments(startDate, endDate, patientId);
        if(services && services.length > 0){
          services.map(c => {
            if(c.status_id == FeegowAPI.Status.ATTENDED){
              let obj = c;
              obj.date = Util.getDateFromString(c.data);
              arrOfServices.push(obj);
            }
          });
        }

      }
      arrOfServices.sort(function(a,b){
        return b["date"].valueOf()- a["date"].valueOf();
      });

      let patientId = arrOfServices[0].paciente_id;
      let patient = FeegowAPI.getPatientById(patientId);
      let patientName = patient.nome;
      let patientFirstName = Util.getFirstName(patientName);
      let patientNumber = patient.whatsapp;
      if(patientNumber){
        let message1 = patientFirstName + ', Dr. Ricardo Matias deixou um recado para você!';

        let message2 = patientFirstName + ", que bom que gostou do meu atendimento! 🤩\n"+
          "Eu ficaria muito grato se você deixasse uma avaliação lá no meu Facebook. "+
          "Isso me ajuda muito na divulgação do meu trabalho.\n" +
          "https://www.facebook.com/pg/drricardomatias/reviews/";

        let message3 = patientFirstName + ", que bom que gostou do nosso atendimento! 🤓\n"+
          "Por favor, deixa uma avaliação lá no Google:\n" +
          "https://g.page/univittaclinica/review?rc\n" +
          "Ajude-nos a levar essa visão a mais pessoas como você! ☺🤝🏻";

        UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, patientNumber, message1, Util.sumDate(today, "7d"), null, UnivittaMessenger.PRIORITY_LOW);
        UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, patientNumber, message2, Util.sumDate(today, "7d"), null, UnivittaMessenger.PRIORITY_LOW);
        UnivittaMessenger.createMessage(UnivittaMessenger.NUMBER_UNIVITTA, patientNumber, message3, Util.sumDate(today, "2d"));
      }
    }
  }

}