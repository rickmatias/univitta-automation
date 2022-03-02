//Dependências: nenhuma

/**
 * Retorna o número de telefone no formato internacional "+55(xx)xxxxx-xxxx".
 * Esta função aceita números de telefone em diversos formatos, mas caso o número
 * fornecido não esteja num formato reconhecido, retorna-o na sua forma original
 * @example
 * let phoneNumber1 = Util.getCanonicalNumber("99940-0404");
 * let phoneNumber2 = Util.getCanonicalNumber("+55 79 9940-0404");
 * let phoneNumber3 = Util.getCanonicalNumber("(79) 99940-0404");
 * let phoneNumber4 = Util.getCanonicalNumber("(79)9940-0404");
 * @param {string} phoneNumber Um número de telefone (em diversos formatos)
 * @returns {string}
 */
Util.getCanonicalNumber = function(numberNotFormatted = "") {
  numberNotFormatted = numberNotFormatted + "";

  let numero = numberNotFormatted.replace(/\D/g, "").replace(/^(0|55)/, "");

  let match1 = numero.match(/^([\d]{2})(9[\d]{8})$/);
  let match2 = numero.match(/^([\d]{2})([2-4][\d]{7})$/);
  let match3 = numero.match(/^9?[89][\d]{7}$/);
  let match4 = numero.match(/^[2-4][\d]{7}$/);
  let match5 = numero.match(/^([\d]{2})([8-9][\d]{7})$/);

  if (match1) {
    let ddd = match1[1];
    let num = match1[2].substr(0, 5) + "-" + match1[2].substr(5, 4);
    return "+55(" + ddd + ")" + num;
  } else if (match2) {
    let ddd = match2[1];
    let num = match2[2].substr(0, 4) + "-" + match2[2].substr(4, 4);
    return "+55(" + ddd + ")" + num;
  } else if (match3) {
    let num = match3[0].substr(-8, 4) + "-" + match3[0].substr(-4);
    return "+55(79)9" + num;
  } else if (match4) {
    let num = match4[0].substr(0, 4) + "-" + match4[0].substr(4, 4);
    return "+55(79)" + num;
  } else if (match5) {
    let ddd = match5[1];
    let num = match5[2].substr(0, 4) + "-" + match5[2].substr(4, 4);
    return "+55(" + ddd + ")9" + num;
  }
  return numberNotFormatted;
}

/**
 * @deprecated Use "Util.getCanonicalNumber".
 * @param {string} numeroSemFormatacao
 */
Util.formatarNumeroTelefone = function(numeroSemFormatacao) {
  return Util.getCanonicalNumber(numeroSemFormatacao);
}

Util.getWhatsappNumberFromNumber = function(number) {
  return Util.getCanonicalNumber(number).replace(/[^\d\+]/g, "");
}

/**
 * Retorna um número de telefone no formato exibido no whatsapp
 * Exemplo: "+55 79 9812-0761"
 * @param {string} phoneNumber - O número de telefone (aceita diversos formatos)
 * @returns {string}
 */
Util.getStandardWhatsappNumber = function(phoneNumber) {
  return Util.getCanonicalNumber(phoneNumber)
    .replace(/\((7[159])\)9/g, "($1)")
    .replace(/\(([\d]{2})\)/g, " $1 ");
}

/**
 * Retorna o número de telefone no formato "(xx) xxxxx-xxxx". Caso o número
 * não tenha um formato reconhecido, retorna o número na sua forma original
 * (não formatado)
 * @example
 * let phoneNumber1 = Util.getLocalNumber("99940-0404");
 * let phoneNumber1 = Util.getLocalNumber("+55 79 9940-0404");
 * @param {string} phoneNumber
 * @returns {string}
 */
Util.getLocalNumber = function(phoneNumber) {
  phoneNumber = Util.getCanonicalNumber(phoneNumber);
  let len = phoneNumber.length;

  //+55(79)99999-9999 ou +55(79)3999-9999
  if (phoneNumber.match(/^\+55/) && (len == 16 || len == 17)) {
    let phoneLocal = phoneNumber.substr(3);
    return phoneLocal.substr(0, 4) + " " + phoneLocal.substr(4);
  }
  return phoneNumber;
}

/**
 * Testa se um número de telefone é um número local padrão
 * Como exemplos, "(79)9xxxx-xxxx" e "(79)3xxxx-xxxx" são números locais padrões
 * Já "0800-765-0000" e "4004-0001" não são números locais padrões
 * @param {string} phoneNumber Um número de telefone
 * @returns {boolean}
 */
Util.isStandardLocalNumber = function(phoneNumber) {
  return Util.isLocalHomePhone(phoneNumber) || Util.isLocalMobilePhone(phoneNumber);
}

/**
 * Testa se um número de telefone é um número de celular no padrão
 * "(xx) 9xxxx-xxxx".
 * Como exemplos, "(79) 98123-0000" e "(75) 97400-0101" são números de celulares
 * @example
 * Util.log(Util.isLocalMobilePhone("(79) 9123-0404")) //Imprime false;
 * Util.log(Util.isLocalMobilePhone("(79)99123-0404")) //Imprime false;
 * Util.log(Util.isLocalMobilePhone("(79) 99123-0404")) //Imprime true;
 * @param {string} phoneNumber Um número de telefone celular
 * @returns {boolean}
 */
Util.isLocalMobilePhone = function(phoneNumber) {
  return phoneNumber.match(/\([\d]{2}\) 9[\d]{4}\-[\d]{4}/);
}

/**
 * Testa se um número de telefone é um número de telefone fixo no padrão
 * "(xx) [234]xxx-xxxx".
 * Como exemplos, "(79) 3123-0000" e "(75) 2400-0101" são números fixos válidos
 * @example
 * Util.log(Util.isLocalHomePhone("(79) 9123-0404")) //Imprime false;
 * Util.log(Util.isLocalHomePhone("(79)4123-0404")) //Imprime false;
 * Util.log(Util.isLocalHomePhone("(79) 4123-0404")) //Imprime true;
 * @param {string} phoneNumber Um número de telefone celular
 * @returns {boolean}
 */
Util.isLocalHomePhone = function(number) {
  return number.match(/\([\d]{2}\) [234][\d]{3}\-[\d]{4}/);
}

/**
 * Retorna o link para o whatsapp.
 * @param {string} phoneToSend Número para o qual deseja enviar a mensagem
 * @param {string} [message] Mensagem a ser enviada
 * @param {string} [prefix] Prefixo do link
 * @example
 * let link =
 * @returns
 */
Util.getWhatsappLink = function(
  phoneToSend,
  message = "",
  prefix = "whatsapp://send"
) {
  let whatsapp = Util.getWhatsappNumberFromNumber(phoneToSend).replace(
    /(\+|\D)/g,
    ""
  );
  let msg = encodeURIComponent(message);
  return prefix + "?phone=" + whatsapp + "&text=" + msg;
}
Util.getPhoneType = function (phoneNumber) {
  phoneNumber = Util.getLocalNumber(phoneNumber);
  return Util.isLocalMobilePhone(phoneNumber) ? "Celular" : "Telefone";
};
