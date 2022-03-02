//Dependências:
//Nenhuma
Util.sendTemplatedEmail = function ( recipient, subject, messageToInsert, from, noReply) {
  noReply = noReply || false;
  from = from || "drricardomatias@clinicaunivitta.com.br";
  let html = HtmlService.createHtmlOutputFromFile("emailResponseTemplate");

  let messageToSend = html.getContent();
  messageToSend = messageToSend.replace("%messageToInsert", messageToInsert);

  GmailApp.sendEmail(recipient, subject, messageToSend, {
    htmlBody: messageToSend,
    noReply: noReply,
    from: from,
  });
};