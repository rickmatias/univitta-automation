/**
 * Created by rickmatias on 15/05/20.
 */
function sendBirthdayMessages(){
  const {UnivittaContacts} = UnivittaContactsLib;
  const {UnivittaMessenger} = UnivittaMessengerLib;

  const today = new Date();
  const expiresAt = Util.sumDate(today, "16h");
  const message1 = "/felizaniversario";

  const patientERows = UnivittaContacts.getPatientERowsOfBirthdaysOfTheDay();

  for(let i=0; i< patientERows.length; i++){
    const patientERow = patientERows[i];
    const phoneNumber = patientERow.getPhoneNumber();
    const patientName = patientERow.getPatientName();
    const patientFirstName = Util.getFirstName(patientName);

    if (!(phoneNumber && UnivittaContacts.numberHasWhatsapp(phoneNumber)))
      continue;

    const message2 = "Feliz aniversário, " + patientFirstName + "! 🎂🥳\n" +
    "Vim aqui te desejar muita saúde, paz e alegria!\n" +
    "Aproveito para mais uma vez te agradecer por confiar a nós da " +
    "Clínica Univitta o seu bem mais precioso: a sua saúde!😀\n\n" +
    "Atenciosamente,\n"+
    "Dr. Ricardo Matias\n" +
    "Médico clínico e CEO da Univitta.";

    UnivittaMessenger.createMessage(
      UnivittaMessenger.Number.NUMBER_UNIVITTA,
      phoneNumber,
      message1,
      today,
      expiresAt,
      UnivittaMessenger.Priority.PRIORITY_HIGH
    );

    UnivittaMessenger.createMessage(
      UnivittaMessenger.Number.NUMBER_UNIVITTA,
      phoneNumber,
      message2,
      today,
      expiresAt,
      UnivittaMessenger.Priority.PRIORITY_HIGH
    );
  }
}