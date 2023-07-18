/**
 * Created by rickmatias on 15/05/20.
 */
function sendBirthdayMessages(){
  const template = "Feliz aniversário, {{PRIMEIRO_NOME}}! 🎂🥳\n" +
    "{{1}}\n" +
    "Aproveito para mais uma vez te agradecer por confiar a nós da Clínica Univitta o seu bem mais precioso: a sua saúde!😀\n\n" +
    "Atenciosamente,\n"+
    "Dr. Ricardo Matias\n" +
    "Médico clínico e CEO da Univitta.";

  const patientERows = UnivittaContacts.getPatientERowsOfBirthdaysOfTheDay();

  for(let i=0; i< patientERows.length; i++){
    const patientERow = patientERows[i];
    const phoneNumber = patientERow.get("Telefone");

    if (!UnivittaContacts.numberHasWhatsapp(phoneNumber))
      continue;

    const patientName = patientERow.get("Paciente");
    const field1 = "Vim aqui te desejar muita saúde, paz e alegria!";

    const today = new Date();
    const expiresAt = Util.sumDate(today, "16h");

    const message1 = "/felizaniversario";
    const message2 = UnivittaMessenger.getMessageFromTemplate(
      template,
      { nome: patientName },
      field1
    );

    UnivittaMessenger.createMessage(
      UnivittaMessenger.NUMBER_UNIVITTA,
      phoneNumber,
      message1,
      today,
      expiresAt,
      UnivittaMessenger.PRIORITY_HIGH
    );

    UnivittaMessenger.createMessage(
      UnivittaMessenger.NUMBER_UNIVITTA,
      phoneNumber,
      message2,
      today,
      expiresAt,
      UnivittaMessenger.PRIORITY_HIGH
    );
  }
}